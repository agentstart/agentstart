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

import type { BaseContext } from "../context";
import { generateTitle } from "../utils/generate-title";
import {
  addProviderOptionsToMessages,
  fixEmptyModelMessages,
  getCompleteMessages,
} from "./message-converter";

type InferUIMessageMetadata<T extends UIMessage> = T extends UIMessage<
  infer METADATA
>
  ? METADATA
  : unknown;
export interface AgentSettings<
  Message extends UIMessage,
  Context extends Omit<BaseContext, "writer">,
> extends AISDK_AgentSettings<ToolSet> {
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<Message>;
}

export class Agent<
  Message extends UIMessage,
  Context extends Omit<BaseContext, "writer">,
> {
  // Core properties
  instructions: string;
  agentsMDPrompt?: string;
  context?: Context;
  messageMetadata?: (options: {
    part: TextStreamPart<ToolSet>;
  }) => InferUIMessageMetadata<Message>;
  settings: AISDK_AgentSettings<ToolSet>;
  instance: AISDK_Agent<ToolSet>;

  // writer management
  private __writer?: UIMessageStreamWriter<Message>;
  private get writer(): UIMessageStreamWriter<Message> | undefined {
    return this.__writer;
  }
  private set writer(value: UIMessageStreamWriter<Message> | undefined) {
    this.__writer = value;
  }

  constructor({
    instructions,
    agentsMDPrompt,
    context,
    messageMetadata,
    ...settings
  }: AgentSettings<Message, Context>) {
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
    onBeforeExecute?: (params: {
      messages: Message[];
      writer: UIMessageStreamWriter<Message>;
    }) => Promise<void>;
    onFinish?: Parameters<typeof createUIMessageStream<Message>>[0]["onFinish"];
    onError?: Parameters<typeof createUIMessageStream<Message>>[0]["onError"];
  }) {
    const uiMessages = (await getCompleteMessages(
      options.message,
      options.chatId,
    )) ?? [options.message];

    return createUIMessageStream({
      generateId,
      originalMessages: uiMessages,
      execute: async ({ writer }) => {
        this.writer = writer;

        // Generate and send title update for the first message
        if (uiMessages.length === 1) {
          // const { title, emoji } = await generateTitle(
          //   [options.message],
          //   this.settings.model, // TODO: Use a separate model for title generation
          // );
          // Update database
          // await Promise.all([
          //   updateChatTitle(chatId, title, emoji),
          //   updateProjectTitle(projectId, title, emoji),
          // ]);
          // Send title update through stream
          // writer.write({
          //   type: "data-title-update",
          //   data: {
          //     chatTitle: title,
          //     chatEmoji: emoji,
          //     projectTitle: title,
          //     projectEmoji: emoji,
          //   },
          // });
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
          // await upsertMessage({
          //   id: setting.responseMessage.id,
          //   chatId: options.chatId,
          //   message: setting.responseMessage,
          // });
        }

        return options?.onFinish?.(setting);
      },
      onError: options?.onError,
    });
  }
}
