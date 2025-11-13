/* agent-frontmatter:start
AGENT: Model Selector UI Component
PURPOSE: Complete model selection component with API integration and state management
USAGE: import { ModelSelector } from "agentstart/components"
EXPORTS: ModelSelector, ModelSelectorProps
FEATURES:
  - Fetches available models from API automatically
  - Manages model selection state globally via store
  - Auto-injects modelId into message sending
  - Dialog-based UI with search and grouping
  - Provider logo display support
SEARCHABLE: model selector, model picker, ui component, model switcher
agent-frontmatter:end */

"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useAgentStartContext, useModelSelector } from "agentstart/client";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Provider logo component with built-in logo URL generation
 * Supports 50+ providers including OpenAI, Anthropic, Google, etc.
 */
export type ModelLogoProps = Omit<ComponentProps<"img">, "src" | "alt"> & {
  provider: string;
};

const ModelLogo = ({ provider, className, ...props }: ModelLogoProps) => (
  <img
    {...props}
    alt={`${provider} logo`}
    className={cn("size-4 shrink-0", className)}
    height={12}
    src={`https://models.dev/logos/${provider}.svg`}
    width={12}
  />
);

/**
 * Model Selector Props
 */
export interface ModelSelectorProps {
  /**
   * Dialog title
   */
  title?: ReactNode;
  /**
   * Custom className for the dialog content
   */
  className?: string;
  /**
   * Placeholder text for search input
   */
  searchPlaceholder?: string;
  /**
   * Empty state text when no models found
   */
  emptyText?: string;
  /**
   * Whether to group models by provider
   */
  groupByProvider?: boolean;
}

/**
 * Complete Model Selector component with API integration
 *
 * Features:
 * - Automatically fetches available models from the API
 * - Manages selection state globally
 * - Auto-injects modelId when sending messages via useThread
 * - Searchable dialog interface with provider grouping
 *
 * @example
 * ```tsx
 * // Basic usage - uses default trigger
 * <ModelSelector />
 *
 * // Custom trigger
 * <ModelSelector
 *   trigger={<Button>Choose Model</Button>}
 *   groupByProvider={true}
 * />
 * ```
 */
export function ModelSelector({
  title = "Select Model",
  className,
  searchPlaceholder = "Search models...",
  emptyText = "No models found.",
  groupByProvider = true,
}: ModelSelectorProps) {
  const { client } = useAgentStartContext();
  const {
    models,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    isLoading,
    isEnabled,
  } = useModelSelector(client);

  const [open, setOpen] = useState(false);

  // Group models by provider if enabled
  const groupedModels = useMemo(() => {
    if (!groupByProvider) {
      return { All: models };
    }

    return models.reduce<Record<string, typeof models>>((acc, model) => {
      const provider = model.provider || "Other";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {});
  }, [models, groupByProvider]);

  // Don't render if models are not configured
  if (!isEnabled) {
    return null;
  }

  const handleSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={isLoading}>
            {selectedModel && <ModelLogo provider={selectedModel.provider} />}
            <span className="truncate">
              {isLoading
                ? "Loading models..."
                : selectedModel
                  ? selectedModel.name
                  : "Select model"}
            </span>
            <CaretDownIcon className="ml-auto size-3.5 shrink-0 opacity-50" />
          </Button>
        }
      />

      <DialogContent className={cn("p-0", className)}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <Command className="**:data-[slot=command-input-wrapper]:h-auto">
          <CommandInput
            className="h-auto py-3.5"
            placeholder={searchPlaceholder}
          />

          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>

            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <CommandGroup
                key={provider}
                heading={groupByProvider ? provider : undefined}
              >
                {Array.isArray(providerModels) &&
                  providerModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.provider}/${model.name}`}
                      onSelect={() => handleSelect(model.id)}
                      className="flex items-center gap-2"
                    >
                      <ModelLogo provider={model.provider} />
                      <span className="flex-1 truncate text-left">
                        {model.name}
                      </span>
                      {selectedModelId === model.id && (
                        <CheckIcon className="ml-auto size-4" weight="bold" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
