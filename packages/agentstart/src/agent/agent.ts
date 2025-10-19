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
import type { AgentStartUIMessage } from "./messages";
import {
  addProviderOptionsToMessages,
  fixEmptyModelMessages,
} from "./messages/message-processing";
import { generateTitle } from "./model-tasks";
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
  instance: AISDK_Agent<ToolSet>;

  // writer management
  private __writer?: UIMessageStreamWriter<AgentStartUIMessage>;
  private get writer(): UIMessageStreamWriter<AgentStartUIMessage> | undefined {
    return this.__writer;
  }
  private set writer(value:
    | UIMessageStreamWriter<AgentStartUIMessage>
    | undefined) {
    this.__writer = value;
  }

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

    this.instance = new AISDK_Agent({
      experimental_context: { ...this.context, writer: this.writer },
      stopWhen: this.settings.stopWhen ?? stepCountIs(100),
      ...this.settings,
    });
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
        this.writer = writer as UIMessageStreamWriter<AgentStartUIMessage>;

        // Generate and send title update for the first message
        if (uiMessages.length === 1) {
          const { title, emoji } = await generateTitle({
            messages: [options.message],
            model: this.settings.model, // TODO: Use a separate model for title generation
          });
          // Update database
          await updateThreadTitle({
            db: options.adapter,
            threadId: options.threadId,
            title,
            emoji,
          });
          // Send title update through stream
          this.writer.write({
            type: "data-agentstart-title_update",
            data: {
              title,
              emoji,
            },
          });
        }

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

        const result = await this.instance.stream({
          messages: modelMessages,
        });

        result.consumeStream();

        writer.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            // sendStart: false,
            messageMetadata: this.metadataHandler,
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
}
