/* agent-frontmatter:start
AGENT: Core agent implementation
PURPOSE: Orchestrate message streaming, persistence, and model execution
USAGE: Instantiate Agent with instructions, memory, and model settings
EXPORTS: Agent, AgentSettings
FEATURES:
  - Streams model responses via the AI SDK agent
  - Persists thread history through configured adapters
  - Applies prompt sanitization before invoking models
SEARCHABLE: agent class, message streaming, persistence orchestration
agent-frontmatter:end */

import { generateId } from "@agentstart/utils";
import {
  convertToModelMessages,
  createUIMessageStream,
  type ModelMessage,
  type UIMessage,
  type UIMessageStreamOnFinishCallback,
  type UIMessageStreamWriter,
  validateUIMessages,
} from "ai";
import type {
  Adapter,
  AgentGenerateSuggestionsOptions,
  AgentGenerateTitleOptions,
  AgentStartOptions,
  UIMessageMetadata,
} from "@/types";
import type { RuntimeContext } from "./context";
import {
  type AgentStartUIMessage,
  dataPartSchema,
  metadataSchema,
} from "./messages";
import {
  addProviderOptionsToMessages,
  fixEmptyUIMessages,
} from "./messages/message-processing";
import { generateThreadSuggestions, generateThreadTitle } from "./model-tasks";
import {
  getCompleteMessages,
  updateThreadTitle,
  upsertMessage,
} from "./persistence";

interface StartOptions {
  input: {
    message: UIMessage;
  };
  runtimeContext: Omit<RuntimeContext, "writer">;
  onFinish?: UIMessageStreamOnFinishCallback<UIMessage>;
  onError?: (error: unknown) => string;
}

export class Run {
  constructor(readonly agentStartOptions: AgentStartOptions) {}

  async start(options: StartOptions) {
    const createdAt = Date.now();
    const agent = this.agentStartOptions.agent;
    const model =
      typeof agent.settings.model === "string"
        ? agent.settings.model
        : agent.settings.model.modelId;
    // Ensure message has metadata object
    if (!options.input.message.metadata) {
      options.input.message.metadata = {};
    }
    if (!(options.input.message.metadata as UIMessageMetadata).createdAt) {
      (options.input.message.metadata as UIMessageMetadata).createdAt =
        createdAt;
    }
    if (!(options.input.message.metadata as UIMessageMetadata).model) {
      (options.input.message.metadata as UIMessageMetadata).model = model;
    }

    const uiMessages = (await getCompleteMessages({
      db: options.runtimeContext.db,
      message: options.input.message,
      threadId: options.runtimeContext.threadId,
    })) ?? [options.input.message];

    return createUIMessageStream({
      generateId,
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        // Fix any array content that should be strings
        const fixedMessages = fixEmptyUIMessages(uiMessages);

        const validatedMessages = await validateUIMessages({
          messages: fixedMessages,
          tools: agent.settings.tools as Parameters<
            typeof validateUIMessages
          >[0]["tools"], // Ensures tool calls in messages match current schemas
          dataSchemas: dataPartSchema.shape,
          metadataSchema,
        });

        // Generate and send title update for the first message
        await this.maybeGenerateThreadTitle({
          writer,
          uiMessages: validatedMessages,
          message: options.input.message,
          threadId: options.runtimeContext.threadId,
          db: options.runtimeContext.db,
          generateTitle: this.agentStartOptions.advanced?.generateTitle,
        });

        // Prepare the model messages
        const converted = convertToModelMessages(validatedMessages, {
          tools: agent.settings.tools,
        });

        let modelMessages: ModelMessage[] = [
          ...(agent.settings.instructions
            ? [
                {
                  role: "system" as const,
                  content: agent.settings.instructions,
                },
              ]
            : []),
          ...converted,
        ];

        // Add providerOptions to the last system, tool, and user/assistant messages
        if (agent.settings.model.toString().startsWith("anthropic/")) {
          modelMessages = addProviderOptionsToMessages(modelMessages, {
            anthropic: {
              cacheControl: { type: "ephemeral" },
            },
          });
        }

        const result = await agent.stream({
          messages: modelMessages,
          options: {
            runtimeContext: {
              writer,
              threadId: options.runtimeContext.threadId,
              sandbox: options.runtimeContext.sandbox,
              db: options.runtimeContext.db,
            },
          },
        });

        result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            messageMetadata: (options) => {
              const agentStartMetadata: UIMessageMetadata = {
                createdAt,
                model,
                totalTokens:
                  options.part.type === "finish"
                    ? options.part.totalUsage.totalTokens
                    : undefined,
                finishReason:
                  options.part.type === "finish"
                    ? options.part.finishReason
                    : undefined,
              };
              return agentStartMetadata;
            },
            onFinish: async (setting) => {
              if (
                setting.responseMessage &&
                setting.responseMessage.parts.length > 0
              ) {
                await this.maybeGenerateThreadSuggestions({
                  uiMessages: setting.messages,
                  writer,
                  generateSuggestions:
                    this.agentStartOptions.advanced?.generateSuggestions,
                });
              }
            },
          }),
        );
      },
      onFinish: async (setting) => {
        // Save the response message to the sandbox's thread history
        if (
          setting.responseMessage &&
          setting.responseMessage.parts.length > 0
        ) {
          await upsertMessage({
            db: options.runtimeContext.db,
            payload: {
              id: setting.responseMessage.id,
              threadId: options.runtimeContext.threadId,
              message: setting.responseMessage,
            },
          });
        }

        return options?.onFinish?.(setting);
      },
      onError: options?.onError,
    });
  }

  /**
   * Generate a thread title if this is the first message.
   * Checks if title generation is enabled and if this is the first message.
   *
   * @param uiMessages - Array of UI messages (to check if first message)
   * @param message - The user's message to generate title from
   * @param threadId - The thread identifier
   * @param writer - Stream writer for sending title update
   * @param adapter - Database adapter for persistence
   */
  private async maybeGenerateThreadTitle({
    writer,
    uiMessages,
    message,
    threadId,
    db,
    generateTitle,
  }: {
    writer: UIMessageStreamWriter<AgentStartUIMessage>;
    uiMessages: UIMessage[];
    message: UIMessage;
    threadId: string;
    db: Adapter;
    generateTitle?: AgentGenerateTitleOptions;
  }): Promise<void> {
    // Only generate for first message
    if (uiMessages.length !== 1) {
      return;
    }

    // Only generate if config is provided
    if (!generateTitle) {
      return;
    }

    const model = generateTitle.model;
    const instructions = generateTitle.instructions;

    try {
      // Generate title based on the user's message
      const title = await generateThreadTitle({
        messages: [message],
        model,
        instructions,
      });

      // Update database
      await updateThreadTitle({
        db,
        threadId,
        title,
      });

      // Send title update through stream
      writer.write({
        type: "data-agentstart-title_update",
        data: {
          title,
        },
        transient: true, // Won't be added to message history
      });
    } catch (err) {
      console.error("Title generation error:", err);
    }
  }

  /**
   * Generate thread suggestions after the agent response completes.
   * Analyzes the conversation context and produces follow-up prompts.
   *
   * @param uiMessages - All UI messages in the conversation including the response
   * @param writer - Stream writer for sending suggestions
   * @param generateSuggestions - Configuration for suggestion generation
   */
  private async maybeGenerateThreadSuggestions({
    uiMessages,
    writer,
    generateSuggestions,
  }: {
    uiMessages: UIMessage[];
    writer: UIMessageStreamWriter<AgentStartUIMessage>;
    generateSuggestions?: AgentGenerateSuggestionsOptions;
  }): Promise<void> {
    // Only generate if config is provided
    if (!generateSuggestions) {
      return;
    }

    const model = generateSuggestions.model;
    const limit = generateSuggestions.limit;
    const instructions = generateSuggestions.instructions;

    try {
      // Build conversation context from recent messages
      // Use last exchange (user + assistant)
      const recentMessages = uiMessages.slice(-2);

      const conversationContext = recentMessages
        .map((msg) => {
          const role = msg.role === "user" ? "User" : "Assistant";
          const text =
            msg.parts.find((part) => part.type === "text")?.text ?? "";
          return `${role}: ${text}`;
        })
        .join("\n\n");

      if (!conversationContext) {
        return;
      }

      // Generate suggestions based on conversation context
      const prompts = await generateThreadSuggestions({
        conversationContext,
        model,
        limit,
        instructions,
      });

      if (prompts.length > 0) {
        // Send suggestions through stream
        writer.write({
          type: "data-agentstart-suggestions",
          data: {
            prompts,
          },
          transient: true, // Won't be added to message history
        });
      }
    } catch (err) {
      console.error("Thread suggestions generation error:", err);
    }
  }
}
