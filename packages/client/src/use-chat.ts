/* agent-frontmatter:start
AGENT: Custom hook for chat streaming functionality
PURPOSE: Encapsulates chat streaming logic with oRPC
USAGE: const { messages, sendMessage, status } = useChatStream();
FEATURES:
  - Handles streaming responses from AI
  - Manages chat state with AI SDK
  - Integrates with oRPC client
SEARCHABLE: chat hook, streaming hook, ai chat logic
agent-frontmatter:end */

import type { AppRouter } from "@agent-stack/api";
import type { AgentStackUIMessage } from "@agent-stack/core";
import { generateId } from "@agent-stack/utils";
import { Chat, useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { ChatTransport } from "ai";
import { toast } from "sonner";

export function createUseChat(client: RouterClient<AppRouter>) {
  const chat = new Chat<AgentStackUIMessage>({
    generateId,
    transport: {
      async sendMessages(options) {
        const lastMessage = options.messages.at(-1)!;
        return eventIteratorToStream(
          await client.chat.stream(
            {
              ...options.body,
              projectId: "test-projectId",
              chatId: "test-chatId",
              model: "test-modelId",
              message: lastMessage,
            },
            { signal: options.abortSignal },
          ),
        );
      },
      reconnectToStream() {
        throw new Error("Reconnection not supported");
      },
    } satisfies ChatTransport<AgentStackUIMessage>,
    onError: (error) => {
      toast.error(`Communication error with the AI: ${error.message}`);
      console.error("Error sending message:", error);
    },
  });

  const hook = () =>
    useChat({
      chat,
    });

  return hook;
}
