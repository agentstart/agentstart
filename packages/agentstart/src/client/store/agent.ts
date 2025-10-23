/* agent-frontmatter:start
AGENT: Agent client store module
PURPOSE: Creates the Zustand store slice that manages agent-level chat state.
USAGE: Use via useAgentStore to read and mutate agent conversation data.
EXPORTS: PendingNewThreadInput, AgentStore, AgentStoreWithSync, getAgentStore, useAgentStore
FEATURES:
  - Initializes per-thread agent store instances on demand
  - Provides typed selectors compatible with AI SDK message helpers
SEARCHABLE: packages, agentstart, src, client, store, agent, zustand
agent-frontmatter:end */

import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import type { DataUIPart, FileUIPart } from "ai";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/shallow";
import type { AgentStartDataPart } from "@/agent";

export type PendingNewThreadInput = {
  text?: string;
  files?: FileList | FileUIPart[];
} | null;

export interface AgentStore<TMessage extends UIMessage = UIMessage>
  extends UseChatHelpers<TMessage> {
  pendingNewThreadInput: PendingNewThreadInput;
  setPendingNewThreadInput: (input: PendingNewThreadInput) => void;
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
``;
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
        pendingNewThreadInput: null,
        setPendingNewThreadInput: (input) => {
          set(
            {
              pendingNewThreadInput: input ? { ...input } : null,
            },
            false,
            "setPendingNewThreadInput",
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
