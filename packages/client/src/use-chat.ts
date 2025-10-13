/* agent-frontmatter:start
AGENT: Chat hook factory
PURPOSE: Build a typed `useChat` hook backed by the Agent client
USAGE: const useChat = createUseChat(client);
EXPORTS: createUseChat
FEATURES:
  - Wraps AI SDK Chat with project/chat identifiers
  - Streams responses via the oRPC client transport
  - Provides toast-based error reporting
SEARCHABLE: chat hook, agent client, streaming chat
agent-frontmatter:end */

import type { AppRouter } from "@agent-stack/api";
import { generateId } from "@agent-stack/utils";
import {
  Chat,
  type UIMessage,
  type UseChatHelpers,
  type UseChatOptions,
  useChat as useOriginalChat,
} from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { AgentStackUIMessage } from "agent-stack";
import type { ChatTransport } from "ai";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { StoreApi, UseBoundStore } from "zustand";
import { type ChatStoreWithSync, getChatStore } from "./store";

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

  const hook = () => {
    return useChat({
      chat,
    });
  };

  return hook;
}

type UseChatOptionsWithStore<TMessage extends UIMessage = UIMessage> =
  UseChatOptions<TMessage> & {
    storeId?: string;
    store?: UseBoundStore<StoreApi<ChatStoreWithSync<TMessage>>>;
  };

function useChat<TMessage extends UIMessage = UIMessage>(
  options: UseChatOptionsWithStore<TMessage> = {} as UseChatOptionsWithStore<TMessage>,
): UseChatHelpers<TMessage> {
  const {
    storeId = "default",
    store: customStore,
    ...originalOptions
  } = options;
  const chatHelpers = useOriginalChat<TMessage>(originalOptions);

  // Use custom store if provided, otherwise get/create default store
  const store = customStore || getChatStore(storeId);
  const storeRef =
    useRef<UseBoundStore<StoreApi<ChatStoreWithSync<TMessage>>>>(store);

  useEffect(() => {
    if (!storeRef.current) return;

    const chatState = {
      id: chatHelpers.id,
      messages: chatHelpers.messages,
      error: chatHelpers.error,
      status: chatHelpers.status,
      sendMessage: chatHelpers.sendMessage,
      regenerate: chatHelpers.regenerate,
      stop: chatHelpers.stop,
      resumeStream: chatHelpers.resumeStream,
      addToolResult: chatHelpers.addToolResult,
      setMessages: chatHelpers.setMessages,
      clearError: chatHelpers.clearError,
    };

    // Check if store has _syncState method (our internal stores)
    if (typeof storeRef.current.getState()._syncState === "function") {
      storeRef.current.getState()._syncState(chatState);
    } else if (typeof storeRef.current.setState === "function") {
      // For standard Zustand stores
      storeRef.current.setState(chatState);
    }
  }, [
    chatHelpers.id,
    chatHelpers.messages,
    chatHelpers.error,
    chatHelpers.status,
    chatHelpers.sendMessage,
    chatHelpers.regenerate,
    chatHelpers.stop,
    chatHelpers.resumeStream,
    chatHelpers.addToolResult,
    chatHelpers.setMessages,
    chatHelpers.clearError,
  ]);

  return chatHelpers;
}
