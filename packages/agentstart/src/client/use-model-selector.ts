/* agent-frontmatter:start
AGENT: Model selector hook
PURPOSE: Manage model selection state and fetch available models
USAGE: const { models, selectedModel, setSelectedModel, isLoading } = useModelSelector(client)
EXPORTS: useModelSelector, UseModelSelectorResult, ModelInfo
FEATURES:
  - Fetches available models from API
  - Manages selected model state via global settings store
  - Provides default model fallback
  - Integrates with AgentStartAPI
SEARCHABLE: model selector hook, model selection, available models, model switching
agent-frontmatter:end */

"use client";

import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type { AgentStartAPI } from "@/api";
import { useSettingStore } from "./store/setting";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export interface UseModelSelectorResult {
  /**
   * List of available models
   */
  models: ModelInfo[];
  /**
   * Currently selected model ID
   */
  selectedModelId: string | null;
  /**
   * Set the selected model ID
   */
  setSelectedModelId: (modelId: string) => void;
  /**
   * Get the full model info for the selected model
   */
  selectedModel: ModelInfo | null;
  /**
   * Whether models are currently being loaded
   */
  isLoading: boolean;
  /**
   * Error loading models
   */
  error: Error | null;
  /**
   * Whether model selection is enabled (true if models are configured)
   */
  isEnabled: boolean;
}

/**
 * Hook to manage model selection
 *
 * @example
 * ```tsx
 * const { models, selectedModelId, setSelectedModelId, selectedModel } = useModelSelector(client);
 *
 * // Display model selector
 * <select value={selectedModelId ?? ''} onChange={(e) => setSelectedModelId(e.target.value)}>
 *   {models.map(model => (
 *     <option key={model.id} value={model.id}>{model.name}</option>
 *   ))}
 * </select>
 *
 * // Use selected model when sending message
 * await thread.append(
 *   { content: "Hello" },
 *   { body: { threadId: "thread-id", modelId: selectedModelId } }
 * );
 * ```
 */
export function useModelSelector(
  client: AgentStartAPI,
): UseModelSelectorResult {
  const orpc = createTanstackQueryUtils(client);

  // Get selected model ID from global settings store
  const selectedModelId = useSettingStore((state) => state.selectedModelId);
  const setSelectedModelIdInStore = useSettingStore(
    (state) => state.setSelectedModelId,
  );

  // Fetch available models
  const {
    data: modelsData,
    isLoading,
    error,
  } = useQuery(
    orpc.model.list.queryOptions({
      input: {},
    }),
  );

  const models = useMemo(() => modelsData?.models ?? [], [modelsData?.models]);
  const defaultModelId = modelsData?.defaultModelId ?? null;
  const isEnabled = models.length > 0;

  // Set default model if no model is selected
  useEffect(() => {
    if (defaultModelId && !selectedModelId) {
      setSelectedModelIdInStore(defaultModelId);
    }
  }, [defaultModelId, selectedModelId, setSelectedModelIdInStore]);

  const setSelectedModelId = useCallback(
    (modelId: string) => {
      setSelectedModelIdInStore(modelId);
    },
    [setSelectedModelIdInStore],
  );

  const selectedModel = useMemo(() => {
    if (!selectedModelId) {
      return null;
    }
    return models.find((m) => m.id === selectedModelId) ?? null;
  }, [models, selectedModelId]);

  return useMemo(
    () => ({
      models,
      selectedModelId,
      setSelectedModelId,
      selectedModel,
      isLoading,
      error: error as Error | null,
      isEnabled,
    }),
    [
      models,
      selectedModelId,
      setSelectedModelId,
      selectedModel,
      isLoading,
      error,
      isEnabled,
    ],
  );
}
