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

"use client";

import { generateId } from "@agentstart/utils";
import {
  Chat,
  type UIMessage,
  type UseChatHelpers,
  type UseChatOptions,
  useChat as useOriginalChat,
} from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/client";
import type { ChatTransport, FileUIPart } from "ai";
import { isFileUIPart } from "ai";
import { useEffect, useMemo, useRef } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AgentStartUIMessage } from "@/agent";
import type { AgentStartAPI } from "@/api";
import { useDataStateMapper } from "./data-state-mapper";
import { type AgentStoreWithSync, getAgentStore } from "./store/agent";
import type { BlobFileList } from "./use-blob-files";

function toSendableFiles(
  files?: BlobFileList,
): FileList | FileUIPart[] | undefined {
  if (!files) {
    return undefined;
  }
  if (files instanceof FileList) {
    return files;
  }
  if (!Array.isArray(files) || files.length === 0) {
    return undefined;
  }
  if (
    files.every(
      (file): file is FileUIPart =>
        !(file instanceof File) && isFileUIPart(file),
    )
  ) {
    return files;
  }
  if (files.every((file) => file instanceof File)) {
    if (typeof DataTransfer === "undefined") {
      return undefined;
    }
    const dataTransfer = new DataTransfer();
    files.forEach((file) => {
      dataTransfer.items.add(file);
    });
    return dataTransfer.files;
  }
  const sendable = files.filter(
    (file): file is FileUIPart => !(file instanceof File) && isFileUIPart(file),
  );
  if (sendable.length > 0) {
    return sendable;
  }
  return undefined;
}

export function createUseThread(client: AgentStartAPI) {
  const hook = (storeId: string = "default") => {
    const mapDataToState = useDataStateMapper(client, storeId);
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
              return eventIteratorToUnproxiedDataStream(
                await client.thread.stream(
                  {
                    ...body,
                    message: lastMessage,
                  },
                  { signal: options.abortSignal },
                ),
              );
            },
            reconnectToStream() {
              throw new Error("Reconnection not supported");
            },
          } satisfies ChatTransport<AgentStartUIMessage>,
          onData: (data) => mapDataToStateRef.current(data),
          onFinish: ({ message, isAbort, isDisconnect, isError }) => {
            if (isAbort || isDisconnect || isError) {
              return;
            }
            if (message.role !== "assistant") {
              return;
            }

            const store = getAgentStore<AgentStartUIMessage>(storeId);
            const {
              messageQueue,
              dequeueQueuedMessage,
              prependQueuedMessage,
              sendMessage,
            } = store.getState();
            if (messageQueue.length === 0) {
              return;
            }
            const next = dequeueQueuedMessage();
            if (!next) {
              return;
            }
            const text = next.text ?? "";
            const sendableFiles = toSendableFiles(next.files);
            const messagePayload: {
              text: string;
              files?: FileList | FileUIPart[];
            } = {
              text,
            };
            if (sendableFiles) {
              messagePayload.files = sendableFiles;
            }
            void sendMessage(messagePayload, {
              body: {
                threadId: storeId,
              },
            }).catch((error) => {
              console.error("Failed to send queued message", error);
              prependQueuedMessage(next);
            });
          },
          onError: (error) => {
            console.error("Error sending message:", error);
          },
        }),
      [],
    );

    return useCreateThread({
      storeId,
      chat: thread,
      experimental_throttle: 50,
    });
  };

  return hook;
}

type UseThreadOptionsWithStore<TMessage extends UIMessage = UIMessage> =
  UseChatOptions<TMessage> & {
    storeId?: string;
    store?: UseBoundStore<StoreApi<AgentStoreWithSync<TMessage>>>;
  };

function useCreateThread<TMessage extends UIMessage = UIMessage>(
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
