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
  Experimental_Agent as AISDK_Agent,
  type Experimental_AgentSettings as AISDK_AgentSettings,
  convertToModelMessages,
  createUIMessageStream,
  type ModelMessage,
  stepCountIs,
  type TextStreamPart,
  type ToolSet,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import type { Agent as AgentContract, AgentStreamOptions } from "@/types";
import type { BaseContext } from "./context";
import type { AgentStartUIMessage } from "./messages";
import {
  addProviderOptionsToMessages,
  fixEmptyModelMessages,
} from "./messages/message-processing";
import { generateThreadSuggestions, generateThreadTitle } from "./model-tasks";
import {
  getCompleteMessages,
  updateThreadTitle,
  upsertMessage,
} from "./persistence";
import { sortTools } from "./tools/sort-tools";

type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<
  infer METADATA
>
  ? METADATA
  : unknown;
export interface AgentOptions<Context extends Record<string, unknown>>
  extends AISDK_AgentSettings<ToolSet> {
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<UIMessage>;
}

export class Agent<
  Context extends Record<string, unknown> = Record<string, unknown>,
> implements AgentContract<Context>
{
  // Core properties
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  private readonly metadataHandler?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<UIMessage>;
  private readonly exposedMessageMetadata?: (options: {
    part: unknown;
  }) => unknown;
  get messageMetadata(): ((options: { part: unknown }) => unknown) | undefined {
    return this.exposedMessageMetadata;
  }
  settings: AISDK_AgentSettings<ToolSet>;

  constructor({
    instructions,
    agentsMDPrompt,
    context,
    messageMetadata,
    ...settings
  }: AgentOptions<Context>) {
    this.instructions = instructions;
    this.agentsMDPrompt = agentsMDPrompt;
    this.context = context;
    this.metadataHandler = messageMetadata;
    this.exposedMessageMetadata = messageMetadata
      ? (options) =>
          messageMetadata?.({
            part: options.part as TextStreamPart<ToolSet>,
          })
      : undefined;

    // sort tools if provided
    if (settings.tools) {
      settings.tools = sortTools(settings.tools);
    }
    this.settings = settings;
  }

  async stream(options: AgentStreamOptions) {
    const uiMessages = (await getCompleteMessages({
      db: options.adapter,
      message: options.message,
      threadId: options.threadId,
    })) ?? [options.message];

    return createUIMessageStream({
      generateId,
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        // Generate and send title update for the first message
        await this.maybeGenerateThreadTitle({
          writer,
          uiMessages,
          message: options.message,
          threadId: options.threadId,
          adapter: options.adapter,
          generateTitle: options.generateTitle,
        });

        // Prepare the model messages
        const converted = convertToModelMessages(uiMessages, {
          tools: this.settings.tools,
        });

        // Fix any array content that should be strings
        const fixedMessages = fixEmptyModelMessages(converted);

        let modelMessages: ModelMessage[] = [
          {
            role: "system" as const,
            content: this.instructions,
          },
          ...(this.agentsMDPrompt
            ? [
                {
                  role: "system" as const,
                  content: `AGENTS.md:\n\n${this.agentsMDPrompt}`,
                },
              ]
            : []),
          ...fixedMessages,
        ];

        // Add providerOptions to the last system, tool, and user/assistant messages
        if (this.settings.model.toString().startsWith("anthropic/")) {
          modelMessages = addProviderOptionsToMessages(modelMessages, {
            anthropic: {
              cacheControl: { type: "ephemeral" },
            },
          });
        }

        const instance = await this.prepareInstance({
          threadId: options.threadId,
          sandbox: options.sandbox,
          adapter: options.adapter,
          writer,
        });

        const result = instance.stream({
          messages: modelMessages,
        });

        result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            messageMetadata: this.metadataHandler,
            onFinish: async (setting) => {
              if (
                setting.responseMessage &&
                setting.responseMessage.parts.length > 0
              ) {
                await this.maybeGenerateThreadSuggestions({
                  uiMessages: setting.messages,
                  writer,
                  generateSuggestions: options.generateSuggestions,
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
            db: options.adapter,
            payload: {
              id: setting.responseMessage.id,
              threadId: options.threadId,
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
    adapter,
    generateTitle,
  }: {
    writer: UIMessageStreamWriter<AgentStartUIMessage>;
    uiMessages: UIMessage[];
    message: UIMessage;
    threadId: string;
    adapter: AgentStreamOptions["adapter"];
    generateTitle: AgentStreamOptions["generateTitle"];
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
        db: adapter,
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
    generateSuggestions: AgentStreamOptions["generateSuggestions"];
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
        });
      }
    } catch (err) {
      console.error("Thread suggestions generation error:", err);
    }
  }

  private async prepareInstance(
    options: Pick<AgentStreamOptions, "threadId" | "sandbox" | "adapter"> & {
      writer: UIMessageStreamWriter<AgentStartUIMessage>;
    },
  ) {
    const context: BaseContext = {
      ...this.context,
      writer: options.writer,
      db: options.adapter,
      sandbox: options.sandbox,
      threadId: options.threadId,
    };
    return new AISDK_Agent({
      experimental_context: context,
      stopWhen: this.settings.stopWhen ?? stepCountIs(100),
      ...this.settings,
    });
  }
}
