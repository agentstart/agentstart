/* agent-frontmatter:start
AGENT: Settings store module
PURPOSE: Manages global user settings independent of threads
USAGE: Use useSettingStore to read and update global settings
EXPORTS: useSettingStore
FEATURES:
  - Manages global model selection
  - Persists settings to localStorage
  - Provides typed selectors
  - Future: theme, language, and other global preferences
SEARCHABLE: settings store, global settings, model selection, user preferences
agent-frontmatter:end */

"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface SettingStore {
  /**
   * Currently selected model ID (global across all threads)
   */
  selectedModelId: string | null;
  /**
   * Set the selected model ID
   */
  setSelectedModelId: (modelId: string | null) => void;
  /**
   * Clear selected model (revert to default)
   */
  clearSelectedModel: () => void;
}

export const useSettingStore = create<SettingStore>()(
  devtools(
    persist(
      (set) => ({
        selectedModelId: null,
        setSelectedModelId: (modelId) =>
          set(
            {
              selectedModelId: modelId,
            },
            false,
            "setSelectedModelId",
          ),
        clearSelectedModel: () =>
          set(
            {
              selectedModelId: null,
            },
            false,
            "clearSelectedModel",
          ),
      }),
      {
        name: "agentstart:settings",
      },
    ),
    {
      name: "AgentStart Settings Store",
    },
  ),
);
