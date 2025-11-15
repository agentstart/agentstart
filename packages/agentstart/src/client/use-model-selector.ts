/* agent-frontmatter:start
AGENT: Model selector hook
PURPOSE: Manage model selection state and fetch available models
USAGE: const { models, selectedModel, setSelectedModel } = useModelSelector()
EXPORTS: useModelSelector, UseModelSelectorResult, ModelInfo
FEATURES:
  - Fetches available models from config.get API
  - Manages selected model state via global settings store
  - Provides default model fallback
  - Integrates with AgentStartAPI
SEARCHABLE: model selector hook, model selection, available models, model switching
agent-frontmatter:end */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAgentStartContext } from "./provider";
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
export function useModelSelector(): UseModelSelectorResult {
  // Get selected model ID from global settings store
  const selectedModelId = useSettingStore((state) => state.selectedModelId);
  const setSelectedModelIdInStore = useSettingStore(
    (state) => state.setSelectedModelId,
  );

  const { config: appConfig } = useAgentStartContext();

  const models = useMemo(
    () => appConfig?.models?.available ?? [],
    [appConfig?.models?.available],
  );
  const defaultModelId = appConfig?.models?.default ?? null;
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
      isEnabled,
    }),
    [models, selectedModelId, setSelectedModelId, selectedModel, isEnabled],
  );
}
