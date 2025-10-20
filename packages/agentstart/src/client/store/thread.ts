import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AgentStartUIMessage } from "@/agent";
import type { DBThread } from "@/db";
import { type AgentStoreWithSync, getAgentStore } from "./agent";

type AgentStoreInstance = UseBoundStore<
  StoreApi<AgentStoreWithSync<AgentStartUIMessage>>
>;

/**
 * Thread Store - Manages thread lifecycle and delegates message state to Agent stores
 */
interface ThreadStore {
  threads: Map<string, DBThread>;

  setThreads: (threads: DBThread[]) => void;
  upsertThread: (thread: DBThread) => void;
  removeThread: (threadId: string) => void;

  ensureAgentStore: (threadId: string) => AgentStoreInstance;

  getThread: (threadId: string) => DBThread | undefined;
  getAllThreads: () => DBThread[];

  clearAll: () => void;
}

export const useThreadStore = create<ThreadStore>()(
  subscribeWithSelector((set, get) => ({
    threads: new Map(),

    setThreads: (threads) => {
      set(() => {
        const nextThreads = new Map<string, DBThread>();
        for (const thread of threads) {
          nextThreads.set(thread.id, thread);
        }

        return {
          threads: nextThreads,
        };
      });
    },

    upsertThread: (thread) => {
      set((state) => {
        const nextThreads = new Map(state.threads);
        nextThreads.set(thread.id, thread);

        return {
          threads: nextThreads,
        };
      });
    },

    removeThread: (threadId) => {
      set((state) => {
        const nextThreads = new Map(state.threads);
        nextThreads.delete(threadId);

        return {
          threads: nextThreads,
        };
      });
    },

    ensureAgentStore: (threadId) =>
      getAgentStore<AgentStartUIMessage>(threadId),

    getThread: (threadId) => get().threads.get(threadId),

    getAllThreads: () => Array.from(get().threads.values()),

    clearAll: () => {
      set({
        threads: new Map(),
      });
    },
  })),
);
