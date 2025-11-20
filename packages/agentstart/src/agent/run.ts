/* agent-frontmatter:start
AGENT: Agent execution orchestrator
PURPOSE: Coordinate message streaming, persistence, validation, and UI message stream creation
USAGE: const run = new Run(agentStartOptions); await run.start({ input, runtimeContext })
EXPORTS: Run
FEATURES:
  - Creates and manages UI message streams via AI SDK
  - Validates messages and ensures tool schema consistency
  - Persists thread messages and metadata to database
  - Generates thread titles and suggestions automatically
  - Fixes empty assistant messages from tool-only responses
SEARCHABLE: agent run, run orchestrator, message streaming, thread persistence
agent-frontmatter:end */

import type { DBThread } from "@agentstart/memory";
import type {
  AgentGenerateSuggestionsOptions,
  AgentGenerateTitleOptions,
  AgentStartOptions,
  MemoryAdapter,
  RuntimeContext,
} from "@agentstart/types";
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
import {
  type AgentUsageSummary,
  createUsageSummary,
  mergeUsageSummaries,
} from "@/agent/usage";
import type { BaseAgent } from "./agent";
import { countAssistantTurns, normalizeMaxTurns } from "./limits/max-turns";
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

type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<
  infer METADATA
>
  ? METADATA
  : Record<string, unknown>;

type UIMessageMetadata = InferUIMessageMetadata<
  UIMessage<Record<string, unknown>>
>;

type UIStreamFinishEvent = Parameters<
  UIMessageStreamOnFinishCallback<UIMessage>
>[0];

export interface RunFinishEvent extends UIStreamFinishEvent {
  usageSummary?: AgentUsageSummary;
}

type RunOnFinishCallback = (event: RunFinishEvent) => PromiseLike<void> | void;

interface StartOptions {
  input: {
    message: AgentStartUIMessage;
    modelId?: string;
  };
  runtimeContext: Omit<RuntimeContext, "writer">;
  onFinish?: RunOnFinishCallback;
  onError?: (error: unknown) => string;
  abortSignal?: AbortSignal;
}

/**
 * Ensures message has metadata with required defaults
 */
function ensureMessageMetadata(
  message: UIMessage,
  defaults: { createdAt: number; modelId: string },
): asserts message is UIMessage & { metadata: UIMessageMetadata } {
  const metadata = (message.metadata ?? {}) as UIMessageMetadata;
  message.metadata = {
    createdAt: metadata.createdAt ?? defaults.createdAt,
    modelId: metadata.model ?? defaults.modelId,
    ...metadata,
  };
}

function deserializeUsageSummary(raw: unknown): AgentUsageSummary | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    if (typeof raw === "string") {
      return JSON.parse(raw) as AgentUsageSummary;
    }

    if (typeof raw === "object") {
      return raw as AgentUsageSummary;
    }
  } catch (error) {
    console.error("Failed to parse stored usage summary:", error);
  }

  return undefined;
}

export class Run {
  constructor(readonly agentStartOptions: AgentStartOptions) {}

  async start(options: StartOptions) {
    const createdAt = Date.now();
    const baseAgent = this.agentStartOptions.agent as BaseAgent;

    // Support dynamic model switching via modelId parameter
    let agent: BaseAgent = baseAgent;
    let modelId: string;

    if (options.input.modelId && this.agentStartOptions.models?.available) {
      // User requested a specific model, find it in the available models list
      const requestedModel = this.agentStartOptions.models.available.find(
        (model) => {
          const id = typeof model === "string" ? model : model.modelId;
          return id === options.input.modelId;
        },
      );

      if (requestedModel) {
        // Create a temporary agent with the requested model
        // We need to cast because we're creating a new instance with the same constructor
        agent = new (
          baseAgent.constructor as new (
            settings: typeof baseAgent.settings,
          ) => BaseAgent
        )({
          ...baseAgent.settings,
          model: requestedModel,
        }) as BaseAgent;

        modelId = options.input.modelId;
      } else {
        // Fallback to default if requested model not found
        console.warn(
          `Model "${options.input.modelId}" not found in available models, using default`,
        );
        modelId =
          typeof baseAgent.settings.model === "string"
            ? baseAgent.settings.model
            : baseAgent.settings.model.modelId;
      }
    } else {
      // Use default agent and extract its model ID
      modelId =
        typeof baseAgent.settings.model === "string"
          ? baseAgent.settings.model
          : baseAgent.settings.model.modelId;
    }

    // Ensure message has metadata with defaults
    ensureMessageMetadata(options.input.message, {
      createdAt,
      modelId: modelId,
    });

    const uiMessages = (await getCompleteMessages({
      memory: options.runtimeContext.memory,
      message: options.input.message,
      threadId: options.runtimeContext.threadId,
    })) ?? [options.input.message];

    const normalizedMaxTurns = normalizeMaxTurns(
      this.agentStartOptions.maxTurns,
    );
    const assistantTurnsBeforeRun = countAssistantTurns(uiMessages);

    const threadRecord = await options.runtimeContext.memory.findOne<DBThread>({
      model: "thread",
      where: [{ field: "id", value: options.runtimeContext.threadId }],
    });

    let aggregatedUsageSummary = deserializeUsageSummary(
      threadRecord?.lastContext,
    );
    let latestUsageSummary: AgentUsageSummary | undefined;

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
          memory: options.runtimeContext.memory,
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
              memory: options.runtimeContext.memory,
            },
          },
          abortSignal: options.abortSignal,
        });

        const usageMetricsPromise = result.totalUsage
          .then((usage) => usage)
          .catch((error) => {
            console.error("Failed to read usage metrics:", error);
            return undefined;
          });

        result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            messageMetadata: (options) => {
              const agentStartMetadata: UIMessageMetadata = {
                createdAt,
                modelId,
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

              const usageMetrics = await usageMetricsPromise;
              const usageSummary = await createUsageSummary({
                modelId,
                usage: usageMetrics,
              });

              if (usageSummary) {
                aggregatedUsageSummary = mergeUsageSummaries(
                  aggregatedUsageSummary,
                  usageSummary,
                );

                if (aggregatedUsageSummary) {
                  latestUsageSummary = aggregatedUsageSummary;
                  writer.write({
                    type: "data-agentstart-usage",
                    data: aggregatedUsageSummary,
                    transient: true,
                  });
                }

                // No need to emit the incremental usage; the aggregated summary
                // reflects the total usage across the thread.
              }

              const responseMessage = setting.responseMessage;
              if (
                normalizedMaxTurns !== null &&
                responseMessage &&
                responseMessage.role === "assistant" &&
                responseMessage.parts.length > 0
              ) {
                const projectedTurns = assistantTurnsBeforeRun + 1;
                if (projectedTurns >= normalizedMaxTurns) {
                  writer.write({
                    type: "data-agentstart-max_turns_reached",
                    data: {
                      threadId: options.runtimeContext.threadId,
                      maxTurns: normalizedMaxTurns,
                      usedTurns: Math.min(projectedTurns, normalizedMaxTurns),
                      message: `This conversation reached the maximum of ${normalizedMaxTurns} turns.`,
                    },
                    transient: true,
                  });
                }
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
            memory: options.runtimeContext.memory,
            payload: {
              id: setting.responseMessage.id,
              threadId: options.runtimeContext.threadId,
              message: setting.responseMessage,
            },
          });
        }

        const extendedSetting: RunFinishEvent = {
          ...setting,
          usageSummary: latestUsageSummary,
        };

        return options?.onFinish?.(extendedSetting);
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
    memory,
    generateTitle,
  }: {
    writer: UIMessageStreamWriter<AgentStartUIMessage>;
    uiMessages: UIMessage[];
    message: UIMessage;
    threadId: string;
    memory: MemoryAdapter;
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
        memory,
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
      // Notify user that title generation failed
      writer.write({
        type: "data-agentstart-title_update_error",
        data: {
          error: err instanceof Error ? err.message : "Unknown error",
        },
        transient: true,
      });
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
      // Notify user that suggestions generation failed
      writer.write({
        type: "data-agentstart-suggestions_error",
        data: {
          error: err instanceof Error ? err.message : "Unknown error",
        },
        transient: true,
      });
    }
  }
}
