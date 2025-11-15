/* agent-frontmatter:start
AGENT: Welcome message UI component
PURPOSE: Display welcome description and initial suggestions for new conversations
USAGE: Import and render in conversation empty state to show agent introduction
EXPORTS: WelcomeMessage, WelcomeMessageProps
FEATURES:
  - Fetches welcome configuration from the API
  - Shows agent description and initial suggestions
  - Click to send suggestion as new message
  - Auto-hides when conversation starts
  - Multi-store support via threadId
SEARCHABLE: welcome message, initial suggestions, agent intro, empty state
agent-frontmatter:end */

"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentStartUIMessage } from "agentstart/agent";
import type { AgentStore } from "agentstart/client";
import {
  getAgentStore,
  useAgentStartContext,
  useAgentStore,
  useStoreRegistry,
} from "agentstart/client";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConversationMessage } from "./conversation/conversation-message";

type UIAgentStore = AgentStore<AgentStartUIMessage>;

export type WelcomeMessageProps = {
  className?: string;
};

export function WelcomeMessage({ className }: WelcomeMessageProps) {
  const { orpc, threadId, setThreadId, navigate } = useAgentStartContext();
  const queryClient = useQueryClient();
  const storeInstances = useStoreRegistry();

  const storeId = threadId ?? "default";

  const sendMessage = useAgentStore<
    AgentStartUIMessage,
    UIAgentStore["sendMessage"]
  >((state) => state.sendMessage, storeId);
  const messages = useAgentStore<AgentStartUIMessage, AgentStartUIMessage[]>(
    (state) => state.messages,
    storeId,
  );
  const setNewThreadDraft = useAgentStore((state) => state.setNewThreadDraft);
  const status = useAgentStore((state) => state.status, storeId);

  const [sendingSuggestion, setSendingSuggestion] = useState<string | null>(
    null,
  );

  const createThreadMutation = useMutation(
    orpc.thread.create.mutationOptions(),
  );

  const isLoading =
    status === "submitted" ||
    status === "streaming" ||
    createThreadMutation?.isPending;

  // Use config from context (fetched once at provider level)
  const { config: appConfig } = useAgentStartContext();

  const handleSuggestionClick = async (suggestion: string) => {
    setSendingSuggestion(suggestion);

    // If no threadId (on homepage), create thread first
    if (!threadId) {
      try {
        const trimmedText = suggestion.trim();
        setNewThreadDraft({
          text: trimmedText,
        });

        const { threadId: newThreadId } =
          await createThreadMutation.mutateAsync({
            visibility: "public",
          });

        // Update context state (single source of truth)
        setThreadId(newThreadId);

        queryClient.invalidateQueries(
          orpc.thread.list.queryOptions({ input: {} }),
        );

        navigate(`/thread/${newThreadId}`);

        const newStore = getAgentStore(storeInstances, newThreadId);
        newStore.getState().sendMessage(
          { text: suggestion },
          {
            body: {
              threadId: newThreadId,
            },
          },
        );
      } catch (error) {
        console.error("[WelcomeMessage] Failed to create thread:", error);
      } finally {
        setSendingSuggestion(null);
      }
    } else {
      // Has threadId, send message directly
      try {
        navigate(`/thread/${threadId}`);
        await sendMessage(
          { text: suggestion },
          {
            body: {
              threadId,
            },
          },
        );
      } finally {
        setSendingSuggestion(null);
      }
    }
  };

  const welcomeConfig = appConfig?.welcome;
  const logo = appConfig?.logo;

  const hasLogo = Boolean(logo);
  const hasDescription = Boolean(welcomeConfig?.description);
  const hasSuggestions =
    Boolean(welcomeConfig?.suggestions) &&
    Array.isArray(welcomeConfig?.suggestions) &&
    welcomeConfig.suggestions.length > 0;

  // Construct a mock message for the welcome (with description or just logo)
  const welcomeMessage: AgentStartUIMessage = useMemo(
    () => ({
      id: "welcome-message",
      role: "assistant",
      parts: hasDescription
        ? [{ type: "text", text: welcomeConfig?.description ?? "" }]
        : [],
    }),
    [hasDescription, welcomeConfig?.description],
  );

  // Don't show if there are messages or welcome is not enabled
  if (messages.length > 0 || !welcomeConfig?.enabled) {
    return null;
  }

  // Need at least logo or description or suggestions
  if (!hasLogo && !hasDescription && !hasSuggestions) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <div className={className}>
        {(hasLogo || hasDescription) && (
          <motion.div
            key="welcome-message"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ConversationMessage
              message={welcomeMessage}
              isLastMessage={false}
              status="ready"
              regenerate={async () => {}}
            />
          </motion.div>
        )}

        {hasSuggestions && welcomeConfig.suggestions && (
          <motion.div
            key="welcome-suggestions"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="mt-2 flex flex-col gap-2"
          >
            <div className="w-fit px-0.5 text-muted-foreground text-sm">
              Try asking:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {welcomeConfig.suggestions.map(
                (suggestion: string, index: number) => (
                  <motion.div
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.2,
                      delay: 0.1 + index * 0.05,
                      ease: "easeOut",
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={isLoading}
                    >
                      {sendingSuggestion === suggestion && <Spinner />}
                      {suggestion}
                      <ArrowUpRightIcon className="size-3" weight="bold" />
                    </Button>
                  </motion.div>
                ),
              )}
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
