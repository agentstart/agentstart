/* agent-frontmatter:start
AGENT: Core agent implementation
PURPOSE: Orchestrate message streaming, persistence, and model execution
USAGE: Instantiate Agent with instructions, memory, and model settings
EXPORTS: Agent, AgentSettings
FEATURES:
  - Streams model responses via the AI SDK agent
  - Persists chat history through configured adapters
  - Applies prompt sanitization before invoking models
SEARCHABLE: agent class, message streaming, persistence orchestration
agent-frontmatter:end */

import { generateId } from "@agent-stack/utils";
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
import { type DatabaseAdapterInstance, memoryAdapter } from "../adapters";
import type { BaseContext } from "../context";
import type { AgentStackUIMessage } from "./messages";
import {
  addProviderOptionsToMessages,
  fixEmptyModelMessages,
} from "./messages/message-processing";
import { generateTitle } from "./model-tasks";
import {
  getCompleteMessages,
  updateChatTitle,
  updateProjectTitle,
  upsertMessage,
} from "./persistence";

type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<
  infer METADATA
>
  ? METADATA
  : unknown;
export interface AgentSettings<
  Message extends UIMessage,
  Context extends Omit<BaseContext, "writer">,
> extends AISDK_AgentSettings<ToolSet> {
  memory?: DatabaseAdapterInstance<unknown>;
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<Message>;
}

export class Agent<
  Message extends UIMessage = UIMessage,
  Context extends Omit<BaseContext, "writer"> = Omit<BaseContext, "writer">,
> {
  // Core properties
  memory: DatabaseAdapterInstance<unknown>;
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<Message>;
  settings: AISDK_AgentSettings<ToolSet>;
  instance: AISDK_Agent<ToolSet>;

  // writer management
  private __writer?: UIMessageStreamWriter<AgentStackUIMessage>;
  private get writer(): UIMessageStreamWriter<AgentStackUIMessage> | undefined {
    return this.__writer;
  }
  private set writer(value:
    | UIMessageStreamWriter<AgentStackUIMessage>
    | undefined) {
    this.__writer = value;
  }

  constructor({
    memory = memoryAdapter(),
    instructions,
    agentsMDPrompt,
    context,
    messageMetadata,
    ...settings
  }: AgentSettings<Message, Context>) {
    this.memory = memory;
    this.instructions = instructions;
    this.agentsMDPrompt = agentsMDPrompt;
    this.context = context;
    this.messageMetadata = messageMetadata;
    this.settings = settings;

    this.instance = new AISDK_Agent({
      experimental_context: { ...this.context, writer: this.writer },
      stopWhen: this.settings.stopWhen ?? stepCountIs(100),
      ...this.settings,
    });
  }

  async stream(options: {
    message: Message;
    chatId: string;
    projectId: string;
    onFinish?: Parameters<typeof createUIMessageStream<Message>>[0]["onFinish"];
    onError?: Parameters<typeof createUIMessageStream<Message>>[0]["onError"];
  }) {
    const uiMessages = (await getCompleteMessages({
      memory: this.memory,
      message: options.message,
      chatId: options.chatId,
    })) ?? [options.message];

    return createUIMessageStream({
      generateId,
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        this.writer = writer as UIMessageStreamWriter<AgentStackUIMessage>;

        // Generate and send title update for the first message
        if (uiMessages.length === 1) {
          const { title, emoji } = await generateTitle({
            messages: [options.message],
            model: this.settings.model, // TODO: Use a separate model for title generation
          });
          // Update database
          await Promise.all([
            updateChatTitle({
              memory: this.memory,
              chatId: options.chatId,
              title,
              emoji,
            }),
            updateProjectTitle({
              memory: this.memory,
              projectId: options.projectId,
              title,
              emoji,
            }),
          ]);
          // Send title update through stream
          this.writer.write({
            type: "data-agent-stack-title_update",
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
            messageMetadata: this.messageMetadata,
          }),
        );
      },
      onFinish: async (setting) => {
        // Save the response message to the sandbox's chat history
        if (
          setting.responseMessage &&
          setting.responseMessage.parts.length > 0
        ) {
          await upsertMessage({
            memory: this.memory,
            payload: {
              id: setting.responseMessage.id,
              chatId: options.chatId,
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
