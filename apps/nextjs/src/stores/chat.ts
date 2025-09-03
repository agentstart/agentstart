// AGENT: Zustand store for chat state management
// PURPOSE: Centralized state management for chat settings
// USAGE: Import useChatStore hook in components
// FEATURES:
//   - Model selection state
//   - Web search toggle state
//   - Persistent state with localStorage
// SEARCHABLE: zustand, chat store, state management

import { create } from "zustand";

interface ChatState {
  model: string;
  webSearch: boolean;
  setModel: (model: string) => void;
  setWebSearch: (enabled: boolean) => void;
  toggleWebSearch: () => void;
}

const DEFAULT_MODEL = "openai/gpt-5";

export const useChatStore = create<ChatState>()((set) => ({
  model: DEFAULT_MODEL,
  webSearch: false,
  setModel: (model) => set({ model }),
  setWebSearch: (webSearch) => set({ webSearch }),
  toggleWebSearch: () => set((state) => ({ webSearch: !state.webSearch })),
}));
