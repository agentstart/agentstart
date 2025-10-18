import type { UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/shallow";

export interface AgentStore<TMessage extends UIMessage = UIMessage>
  extends UseChatHelpers<TMessage> {}

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
