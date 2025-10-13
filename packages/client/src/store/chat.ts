import type { AgentStackUIMessage } from "agent-stack";
import type { DBChat } from "agent-stack/db";
import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { type AgentStoreWithSync, getAgentStore } from "./agent";

type AgentStoreInstance = UseBoundStore<
  StoreApi<AgentStoreWithSync<AgentStackUIMessage>>
>;

/**
 * Chat Store - Manages chat lifecycle and delegates message state to Agent stores
 */
interface ChatStore {
  projectId?: string;
  chats: Map<string, DBChat>;
  activeChatId?: string;

  setProjectChats: (projectId: string, chats: DBChat[]) => void;
  upsertChat: (chat: DBChat) => void;
  removeChat: (chatId: string) => void;
  setActiveChat: (chatId: string | undefined) => void;

  ensureAgentStore: (chatId: string) => AgentStoreInstance;

  getChat: (chatId: string) => DBChat | undefined;
  getActiveChat: () => DBChat | undefined;
  getAllChats: () => DBChat[];

  clearAll: () => void;
}

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector((set, get) => ({
    projectId: undefined,
    chats: new Map(),
    activeChatId: undefined,

    setProjectChats: (projectId, chats) => {
      const previousActiveChat = get().activeChatId;
      set(() => {
        const nextChats = new Map<string, DBChat>();
        for (const chat of chats) {
          nextChats.set(chat.id, chat);
        }

        const fallbackChatId = chats[0]?.id;
        const activeChatId =
          previousActiveChat && nextChats.has(previousActiveChat)
            ? previousActiveChat
            : fallbackChatId;

        return {
          projectId,
          chats: nextChats,
          activeChatId,
        };
      });
    },

    upsertChat: (chat) => {
      set((state) => {
        const nextChats = new Map(state.chats);
        nextChats.set(chat.id, chat);

        return {
          chats: nextChats,
          activeChatId: state.activeChatId ?? chat.id,
        };
      });
    },

    removeChat: (chatId) => {
      set((state) => {
        const nextChats = new Map(state.chats);
        nextChats.delete(chatId);

        const nextActiveChatId =
          state.activeChatId === chatId ? undefined : state.activeChatId;

        return {
          chats: nextChats,
          activeChatId: nextActiveChatId,
        };
      });
    },

    setActiveChat: (chatId) => {
      if (chatId) {
        getAgentStore<AgentStackUIMessage>(chatId);
      }
      set({
        activeChatId: chatId,
      });
    },

    ensureAgentStore: (chatId) => getAgentStore<AgentStackUIMessage>(chatId),

    getChat: (chatId) => get().chats.get(chatId),

    getActiveChat: () => {
      const state = get();
      return state.activeChatId
        ? state.chats.get(state.activeChatId)
        : undefined;
    },

    getAllChats: () => Array.from(get().chats.values()),

    clearAll: () => {
      set({
        projectId: undefined,
        chats: new Map(),
        activeChatId: undefined,
      });
    },
  })),
);
