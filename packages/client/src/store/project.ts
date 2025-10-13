import type { FileUIPart } from "ai";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const newProjectInput: {
  text?: string;
  files?: FileList | FileUIPart[];
} = {};

/**
 * Project Store - Single project state management
 *
 * Manages project-level metadata, not sandbox-specific details
 */

interface ProjectStore {
  // Project metadata
  id?: string;
  name?: string;
  description?: string;

  // Actions
  setId: (id: string) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;

  // Reset
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    id: undefined,
    name: undefined,
    description: undefined,

    // Actions
    setId: (id) => set(() => ({ id })),

    setName: (name) => set(() => ({ name })),

    setDescription: (description) => set(() => ({ description })),

    reset: () => {
      set({
        id: undefined,
        name: undefined,
        description: undefined,
      });
    },
  })),
);
