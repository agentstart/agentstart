/* agent-frontmatter:start
AGENT: Agent client store module
PURPOSE: Creates the Zustand store slice that manages agent-level chat state.
USAGE: Use via useAgentStore to read and mutate agent conversation data.
EXPORTS: ThreadDraft, QueuedAgentMessage, AgentStore, AgentStoreWithSync, getAgentStore, useAgentStore
FEATURES:
  - Initializes per-thread agent store instances on demand
  - Provides typed selectors compatible with AI SDK message helpers
SEARCHABLE: packages, agentstart, src, client, store, agent, zustand
agent-frontmatter:end */

import { generateId } from "@agentstart/utils";
import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import type { DataUIPart, FileUIPart } from "ai";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import type { AgentStartDataPart } from "@/agent";

export type ThreadDraft =
  | {
      text: string;
      files?: FileList | FileUIPart[];
    }
  | {
      text?: string;
      files: FileList | FileUIPart[];
    };

export interface QueuedAgentMessage {
  id: string;
  text?: string;
  files?: FileUIPart[];
  createdAt: number;
}

export interface AgentStore<TMessage extends UIMessage = UIMessage>
  extends UseChatHelpers<TMessage> {
  newThreadDraft: ThreadDraft | null;
  setNewThreadDraft: (input: ThreadDraft | null) => void;
  messageQueue: QueuedAgentMessage[];
  enqueueQueuedMessage: (
    input: Omit<QueuedAgentMessage, "id" | "createdAt">,
  ) => QueuedAgentMessage;
  dequeueQueuedMessage: () => QueuedAgentMessage | undefined;
  takeQueuedMessageById: (id: string) => QueuedAgentMessage | undefined;
  removeQueuedMessage: (id: string) => void;
  prependQueuedMessage: (message: QueuedAgentMessage) => void;
  moveQueuedMessage: (id: string, direction: "up" | "down") => void;
  clearMessageQueue: () => void;
  dataParts: Map<
    DataUIPart<AgentStartDataPart>["type"],
    DataUIPart<AgentStartDataPart>["data"]
  >;
  setDataPart: (
    type: DataUIPart<AgentStartDataPart>["type"],
    data: DataUIPart<AgentStartDataPart>["data"],
  ) => void;
  removeDataPart: (type: DataUIPart<AgentStartDataPart>["type"]) => void;
}
// Internal sync method for connecting with useThread
export interface AgentStoreWithSync<TMessage extends UIMessage = UIMessage>
  extends AgentStore<TMessage> {
  _syncState: (newState: Partial<AgentStore<TMessage>>) => void;
}

// Store instances map (using any for simplicity due to generic constraints)
const storeInstances = new Map<
  string,
  // biome-ignore lint/suspicious/noExplicitAny: is fine
  UseBoundStore<StoreApi<AgentStoreWithSync<any>>>
>();

function createAgentStore<TMessage extends UIMessage = UIMessage>() {
  return create<AgentStoreWithSync<TMessage>>()(
    devtools(
      (set) => ({
        // Default state matching UseChatHelpers interface
        id: "",
        messages: [] as TMessage[],
        error: undefined,
        status: "ready" as const,

        // Default no-op functions (will be replaced by useThread)
        sendMessage: async () => {},
        regenerate: async () => {},
        stop: async () => {},
        resumeStream: async () => {},
        addToolResult: async () => {},
        setMessages: () => {},
        clearError: () => {},
        newThreadDraft: null,
        setNewThreadDraft: (input) => {
          set(
            {
              newThreadDraft: input ? { ...input } : null,
            },
            false,
            "setNewThreadDraft",
          );
        },
        messageQueue: [
          {
            id: "example-queued-message-id",
            text: "This is an example queued message1.",
            createdAt: Date.now(),
          },
          {
            id: "example-queued-message-id",
            text: "This is an example queued message2.",
            createdAt: Date.now(),
          },
          {
            id: "example-queued-message-id",
            text: "This is an example queued message3.",
            createdAt: Date.now(),
          },
          {
            id: "example-queued-message-id",
            text: "This is an example queued message4.",
            createdAt: Date.now(),
          },
          {
            id: "example-queued-message-id",
            text: "This is an example queued message5.",
            createdAt: Date.now(),
          },
        ],
        enqueueQueuedMessage: (input) => {
          const queuedItem: QueuedAgentMessage = {
            ...input,
            files: input.files ? [...input.files] : undefined,
            id: generateId(),
            createdAt: Date.now(),
          };
          set(
            (state) => ({
              messageQueue: [...state.messageQueue, queuedItem],
            }),
            false,
            "enqueueQueuedMessage",
          );
          return queuedItem;
        },
        dequeueQueuedMessage: () => {
          let dequeued: QueuedAgentMessage | undefined;
          set(
            (state) => {
              if (state.messageQueue.length === 0) {
                return state;
              }
              const [first, ...rest] = state.messageQueue;
              dequeued = first;
              return { messageQueue: rest };
            },
            false,
            "dequeueQueuedMessage",
          );
          return dequeued;
        },
        takeQueuedMessageById: (id) => {
          let removed: QueuedAgentMessage | undefined;
          set(
            (state) => {
              const index = state.messageQueue.findIndex(
                (item) => item.id === id,
              );
              if (index === -1) {
                return state;
              }
              const nextQueue = state.messageQueue.slice();
              const [extracted] = nextQueue.splice(index, 1);
              removed = extracted;
              return { messageQueue: nextQueue };
            },
            false,
            "takeQueuedMessageById",
          );
          return removed;
        },
        prependQueuedMessage: (message) => {
          set(
            (state) => ({
              messageQueue: [message, ...state.messageQueue],
            }),
            false,
            "prependQueuedMessage",
          );
        },
        removeQueuedMessage: (id) => {
          set(
            (state) => {
              const nextQueue = state.messageQueue.filter(
                (item) => item.id !== id,
              );
              if (nextQueue.length === state.messageQueue.length) {
                return state;
              }
              return { messageQueue: nextQueue };
            },
            false,
            "removeQueuedMessage",
          );
        },
        moveQueuedMessage: (id, direction) => {
          set(
            (state) => {
              const index = state.messageQueue.findIndex(
                (item) => item.id === id,
              );
              if (index === -1) {
                return state;
              }
              const targetIndex = direction === "up" ? index - 1 : index + 1;
              if (targetIndex < 0 || targetIndex >= state.messageQueue.length) {
                return state;
              }
              const nextQueue = state.messageQueue.slice();
              const [movedItem] = nextQueue.splice(index, 1);
              if (!movedItem) {
                return state;
              }
              nextQueue.splice(targetIndex, 0, movedItem);
              return { messageQueue: nextQueue };
            },
            false,
            "moveQueuedMessage",
          );
        },
        clearMessageQueue: () => {
          set(
            {
              messageQueue: [],
            },
            false,
            "clearMessageQueue",
          );
        },

        dataParts: new Map(),
        setDataPart: (type, data) =>
          set(
            (state) => {
              const newDataParts = new Map(state.dataParts);
              newDataParts.set(type, data);
              return { dataParts: newDataParts };
            },
            false,
            "setDataPart",
          ),
        removeDataPart: (type) =>
          set(
            (state) => {
              const newDataParts = new Map(state.dataParts);
              newDataParts.delete(type);
              return { dataParts: newDataParts };
            },
            false,
            "removeDataPart",
          ),

        // Internal sync method for useThread integration
        _syncState: (newState: Partial<AgentStore<TMessage>>) => {
          set(newState, false, "syncFromUseThread");
        },
      }),
      {
        name: "agentstart-agent-store",
      },
    ),
  );
}

export function getAgentStore<TMessage extends UIMessage = UIMessage>(
  storeId: string = "default",
) {
  if (!storeInstances.has(storeId)) {
    storeInstances.set(storeId, createAgentStore<TMessage>());
  }
  return storeInstances.get(storeId)!;
}

export function useAgentStore<
  TMessage extends UIMessage = UIMessage,
  T = unknown,
>(
  selector: (state: AgentStore<TMessage>) => T,
  storeId: string = "default",
): T {
  const useStore = getAgentStore(storeId);
  return useStore(useShallow(selector));
}
