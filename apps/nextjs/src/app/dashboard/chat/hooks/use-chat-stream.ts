// AGENT: Custom hook for chat streaming functionality
// PURPOSE: Encapsulates chat streaming logic with oRPC
// USAGE: const { messages, sendMessage, status } = useChatStream();
// FEATURES:
//   - Handles streaming responses from AI
//   - Manages chat state with AI SDK
//   - Integrates with oRPC client
// SEARCHABLE: chat hook, streaming hook, ai chat logic

import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import { client } from "@/lib/orpc";
import { useChatStore } from "@/stores/chat";
import type { ChatModel } from "../constants";
import { toast } from "sonner";

export function useChatStream() {
  const { model, webSearch } = useChatStore();

  const { messages, sendMessage, status, regenerate, stop, setMessages } =
    useChat({
      transport: {
        async sendMessages(options) {
          const body = options.body as {
            model: ChatModel;
            webSearch: boolean;
          };
          return eventIteratorToStream(
            await client.chat.stream(
              {
                chatId: options.chatId,
                messages: options.messages,
                model: body?.model ?? useChatStore.getState().model,
                webSearch: body?.webSearch ?? useChatStore.getState().webSearch,
              },
              { signal: options.abortSignal },
            ),
          );
        },
        reconnectToStream() {
          throw new Error("Reconnection not supported");
        },
      },
      onError(error) {
        toast.error(error.message || "An error occurred");
      },
    });

  const handleSendMessage = (text: string) => {
    sendMessage(
      { text },
      {
        body: {
          model,
          webSearch,
        },
      },
    );
  };

  const handleEdit = (messageId: string, newContent: string) => {
    // Find the message index
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);

    if (messageIndex >= 0) {
      // Remove this message and all messages after it
      const updatedMessages = messages.slice(0, messageIndex);
      setMessages(updatedMessages);

      // Send the edited message
      sendMessage(
        { text: newContent },
        {
          body: {
            model,
            webSearch,
          },
        },
      );
    }
  };

  return {
    messages,
    sendMessage: handleSendMessage,
    regenerate,
    stop,
    edit: handleEdit,
    status,
  };
}
