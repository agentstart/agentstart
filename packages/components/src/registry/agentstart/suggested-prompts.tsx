/* agent-frontmatter:start
AGENT: Suggested prompts UI component
PURPOSE: Display AI-generated follow-up suggestions as interactive buttons
USAGE: Import and render in agent conversation UI to show contextual next-step prompts
EXPORTS: SuggestedPrompts
FEATURES:
  - Animated appearance and dismissal with Framer Motion
  - Automatic data extraction from agent message stream
  - Click to send suggestion as new message
  - Auto-clear on interaction
  - Multi-store support via threadId
SEARCHABLE: suggested prompts, follow-up suggestions, agent ui, conversation actions
agent-frontmatter:end */

"use client";

import { useAgentStore, useDataPart } from "agentstart/client";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SuggestionsProps = ComponentProps<typeof ScrollArea> & {
  threadId?: string;
};

export function SuggestedPrompts({
  threadId,
  className,
  ...props
}: SuggestionsProps) {
  const storeId = threadId ?? "default";
  const [suggestions, clearSuggestions] = useDataPart(
    "data-agentstart-suggestions",
    storeId,
  );
  const sendMessage = useAgentStore((state) => state.sendMessage, storeId);

  const handlePromptClick = (prompt: string) => {
    clearSuggestions();
    sendMessage({ text: prompt });
  };

  if (!suggestions?.prompts || suggestions.prompts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <ScrollArea
        className="mx-auto mb-4 flex gap-2 overflow-x-auto sm:min-w-[390px] sm:max-w-3xl"
        {...props}
      >
        <div
          className={cn("flex w-max flex-nowrap items-center gap-2", className)}
        >
          {suggestions.prompts.map((prompt, index) => (
            <motion.div
              key={prompt}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.2,
                delay: index * 0.05,
                ease: "easeOut",
              }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePromptClick(prompt)}
                className="cursor-pointer"
              >
                {prompt}
              </Button>
            </motion.div>
          ))}
        </div>

        <ScrollBar className="hidden" orientation="horizontal" />
      </ScrollArea>
    </AnimatePresence>
  );
}
