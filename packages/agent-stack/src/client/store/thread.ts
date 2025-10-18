import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AgentStackUIMessage } from "@/agent";
import type { DBThread } from "@/db";
import { type AgentStoreWithSync, getAgentStore } from "./agent";

type AgentStoreInstance = UseBoundStore<
  StoreApi<AgentStoreWithSync<AgentStackUIMessage>>
>;

/**
 * Thread Store - Manages thread lifecycle and delegates message state to Agent stores
 */
interface ThreadStore {
  threads: Map<string, DBThread>;
  activeThreadId?: string;

  setThreads: (threads: DBThread[]) => void;
  upsertThread: (thread: DBThread) => void;
  removeThread: (threadId: string) => void;
  setActiveThread: (threadId: string | undefined) => void;

  ensureAgentStore: (threadId: string) => AgentStoreInstance;

  getThread: (threadId: string) => DBThread | undefined;
  getActiveThread: () => DBThread | undefined;
  getAllThreads: () => DBThread[];

  clearAll: () => void;
}

export const useThreadStore = create<ThreadStore>()(
  subscribeWithSelector((set, get) => ({
    threads: new Map(),
    activeThreadId: undefined,

    setThreads: (threads) => {
      const previousActiveThread = get().activeThreadId;
      set(() => {
        const nextThreads = new Map<string, DBThread>();
        for (const thread of threads) {
          nextThreads.set(thread.id, thread);
        }

        const fallbackThreadId = threads[0]?.id;
        const activeThreadId =
          previousActiveThread && nextThreads.has(previousActiveThread)
            ? previousActiveThread
            : fallbackThreadId;

        return {
          threads: nextThreads,
          activeThreadId,
        };
      });
    },

    upsertThread: (thread) => {
      set((state) => {
        const nextThreads = new Map(state.threads);
        nextThreads.set(thread.id, thread);

        return {
          threads: nextThreads,
          activeThreadId: state.activeThreadId ?? thread.id,
        };
      });
    },

    removeThread: (threadId) => {
      set((state) => {
        const nextThreads = new Map(state.threads);
        nextThreads.delete(threadId);

        const nextActiveThreadId =
          state.activeThreadId === threadId ? undefined : state.activeThreadId;

        return {
          threads: nextThreads,
          activeThreadId: nextActiveThreadId,
        };
      });
    },

    setActiveThread: (threadId) => {
      if (threadId) {
        getAgentStore<AgentStackUIMessage>(threadId);
      }
      set({
        activeThreadId: threadId,
      });
    },

    ensureAgentStore: (threadId) =>
      getAgentStore<AgentStackUIMessage>(threadId),

    getThread: (threadId) => get().threads.get(threadId),

    getActiveThread: () => {
      const state = get();
      return state.activeThreadId
        ? state.threads.get(state.activeThreadId)
        : undefined;
    },

    getAllThreads: () => Array.from(get().threads.values()),

    clearAll: () => {
      set({
        threads: new Map(),
        activeThreadId: undefined,
      });
    },
  })),
);
