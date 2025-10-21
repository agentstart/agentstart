/* agent-frontmatter:start
AGENT: Thread hook factory
PURPOSE: Build a typed `useThread` hook backed by the Agent client
USAGE: const useThread = createUseThread(client);
EXPORTS: createUseThread
FEATURES:
  - Wraps AI SDK Chat with thread identifiers
  - Streams responses via the oRPC client transport
  - Provides toast-based error reporting
SEARCHABLE: thread hook, agent client, streaming thread
agent-frontmatter:end */

import { generateId } from "@agentstart/utils";
import {
  Chat,
  type UIMessage,
  type UseChatHelpers,
  type UseChatOptions,
  useChat as useOriginalChat,
} from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import type { ChatTransport, UIDataTypes, UIMessageChunk } from "ai";
import { useEffect, useMemo, useRef } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AgentStartUIMessage } from "@/agent";
import type { AgentStartAPI } from "@/api";
import { useDataStateMapper } from "./data-state-mapper";
import { type AgentStoreWithSync, getAgentStore } from "./store/agent";

export function createUseThread(client: AgentStartAPI) {
  const hook = () => {
    const mapDataToState = useDataStateMapper(client);
    const mapDataToStateRef = useRef(mapDataToState);
    mapDataToStateRef.current = mapDataToState;

    // biome-ignore lint/correctness/useExhaustiveDependencies: is fine
    const thread = useMemo(
      () =>
        new Chat<AgentStartUIMessage>({
          generateId,
          transport: {
            async sendMessages(options) {
              const lastMessage = options.messages.at(-1)!;
              const body = options.body as {
                threadId: string;
              };
              return eventIteratorToStream(
                await client.thread.stream(
                  {
                    ...body,
                    message: lastMessage,
                  },
                  { signal: options.abortSignal },
                ),
              ) as ReadableStream<UIMessageChunk<unknown, UIDataTypes>>;
            },
            reconnectToStream() {
              throw new Error("Reconnection not supported");
            },
          } satisfies ChatTransport<AgentStartUIMessage>,
          onData: (data) => mapDataToStateRef.current(data),
          onError: (error) => {
            console.error("Error sending message:", error);
          },
        }),
      [],
    );

    return useThread({
      chat: thread,
    });
  };

  return hook;
}

type UseThreadOptionsWithStore<TMessage extends UIMessage = UIMessage> =
  UseChatOptions<TMessage> & {
    storeId?: string;
    store?: UseBoundStore<StoreApi<AgentStoreWithSync<TMessage>>>;
  };

function useThread<TMessage extends UIMessage = UIMessage>(
  options: UseThreadOptionsWithStore<TMessage> = {} as UseThreadOptionsWithStore<TMessage>,
): UseChatHelpers<TMessage> {
  const {
    storeId = "default",
    store: customStore,
    ...originalOptions
  } = options;
  const threadHelpers = useOriginalChat<TMessage>(originalOptions);

  // Use custom store if provided, otherwise get/create default store
  const store = customStore || getAgentStore(storeId);
  const storeRef =
    useRef<UseBoundStore<StoreApi<AgentStoreWithSync<TMessage>>>>(store);

  useEffect(() => {
    if (!storeRef.current) return;

    const threadState = {
      id: threadHelpers.id,
      messages: threadHelpers.messages,
      error: threadHelpers.error,
      status: threadHelpers.status,
      sendMessage: threadHelpers.sendMessage,
      regenerate: threadHelpers.regenerate,
      stop: threadHelpers.stop,
      resumeStream: threadHelpers.resumeStream,
      addToolResult: threadHelpers.addToolResult,
      setMessages: threadHelpers.setMessages,
      clearError: threadHelpers.clearError,
    };

    // Check if store has _syncState method (our internal stores)
    if (typeof storeRef.current.getState()._syncState === "function") {
      storeRef.current.getState()._syncState(threadState);
    } else if (typeof storeRef.current.setState === "function") {
      // For standard Zustand stores
      storeRef.current.setState(threadState);
    }
  }, [
    threadHelpers.id,
    threadHelpers.messages,
    threadHelpers.error,
    threadHelpers.status,
    threadHelpers.sendMessage,
    threadHelpers.regenerate,
    threadHelpers.stop,
    threadHelpers.resumeStream,
    threadHelpers.addToolResult,
    threadHelpers.setMessages,
    threadHelpers.clearError,
  ]);

  return threadHelpers;
}
