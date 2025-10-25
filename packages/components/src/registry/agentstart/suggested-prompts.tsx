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

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { useAgentStore, useDataPart } from "agentstart/client";
import type { HTMLMotionProps } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

export type SuggestionsProps = Omit<HTMLMotionProps<"div">, "children"> & {
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
    sendMessage(
      { text: prompt },
      {
        body: {
          threadId,
        },
      },
    );
  };

  if (!suggestions?.prompts || suggestions.prompts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="suggested-prompts"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={className}
        {...props}
      >
        <div className="w-fit px-0.5 pt-1 pb-2 text-muted-foreground">
          Suggestions
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                <ArrowUpRightIcon className="size-3" weight="bold" />
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
