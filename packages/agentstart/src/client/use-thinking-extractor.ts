/* agent-frontmatter:start
AGENT: Thinking status extraction from AI reasoning
PURPOSE: React hook for extracting and displaying AI thinking status from reasoning parts
USAGE: Import useThinkingExtractor to automatically extract thinking status from streaming messages
EXPORTS: useThinkingExtractor, extractFirstBold
FEATURES:
  - Extracts bold text (**text**) from reasoning parts during streaming
  - Automatically updates store's thinkingStatus
  - Clears status when not streaming
  - Type-safe integration with agent store
  - Zero-config automatic extraction
SEARCHABLE: thinking extractor, reasoning status, streaming indicator, AI thinking
agent-frontmatter:end */

"use client";

import type { UIMessage } from "ai";
import { useEffect } from "react";
import type { AgentStore } from "./store";
import { useAgentStore } from "./store";

/**
 * Extracts the first bold text (**text**) from a string.
 *
 * This function parses markdown-style bold text and returns the first occurrence.
 * Used to extract thinking status from AI reasoning text.
 *
 * @param text - The text to parse for bold formatting
 * @returns The first bold text found, or null if none exists
 *
 * @example
 * extractFirstBold("**Analyzing code**\nLet me check...")
 * // Returns: "Analyzing code"
 *
 * @example
 * extractFirstBold("No bold text here")
 * // Returns: null
 */
function extractFirstBold(text: string): string | null {
  if (!text) return null;

  let i = 0;
  while (i + 1 < text.length) {
    if (text[i] === "*" && text[i + 1] === "*") {
      const start = i + 2;
      let j = start;
      while (j + 1 < text.length) {
        if (text[j] === "*" && text[j + 1] === "*") {
          const inner = text.substring(start, j).trim();
          return inner.length > 0 ? inner : null;
        }
        j++;
      }
      return null;
    }
    i++;
  }
  return null;
}

/**
 * Hook that extracts thinking status from the latest message's reasoning parts.
 *
 * This hook monitors the message stream and automatically extracts bold text from
 * reasoning parts when the agent is streaming. The extracted status is stored in
 * the agent store's `thinkingStatus` field and can be used to display real-time
 * thinking indicators to users.
 *
 * The hook will:
 * - Only extract when status is "streaming"
 * - Look for the latest assistant message
 * - Find reasoning parts in the message
 * - Extract bold text using extractFirstBold()
 * - Update store.thinkingStatus with the result
 * - Clear thinkingStatus when not streaming
 *
 * @param storeId - The agent store ID to read from and update (default: "default")
 *
 * @example
 * function Conversation({ threadId }: { threadId: string }) {
 *   // Automatically extracts thinking status from streaming messages
 *   useThinkingExtractor(threadId);
 *
 *   const thinkingStatus = useAgentStore(state => state.thinkingStatus, threadId);
 *
 *   return (
 *     <div>
 *       {thinkingStatus && <StatusIndicator text={thinkingStatus} />}
 *     </div>
 *   );
 * }
 *
 * @remarks
 * This hook assumes that reasoning text follows the convention of using **bold**
 * for status indicators. For example:
 *
 * ```
 * **Analyzing codebase structure**
 *
 * I need to understand the component hierarchy...
 * ```
 *
 * Would extract "Analyzing codebase structure" as the thinking status.
 */
export function useThinkingExtractor<TMessage extends UIMessage = UIMessage>(
  storeId: string = "default",
) {
  const messages = useAgentStore<TMessage, TMessage[]>(
    (state) => state.messages,
    storeId,
  );
  const status = useAgentStore<TMessage, AgentStore<TMessage>["status"]>(
    (state) => state.status,
    storeId,
  );
  const setThinkingStatus = useAgentStore<
    TMessage,
    AgentStore<TMessage>["setThinkingStatus"]
  >((state) => state.setThinkingStatus, storeId);

  useEffect(() => {
    // Only extract thinking when streaming
    if (status !== "streaming") {
      setThinkingStatus(null);
      return;
    }

    // Get the last message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") {
      setThinkingStatus(null);
      return;
    }

    // Find reasoning part
    const parts = lastMessage.parts ?? [];
    const reasoningPart = parts.find((part) => part.type === "reasoning");

    if (!reasoningPart) {
      setThinkingStatus(null);
      return;
    }

    // Extract text from reasoning part
    const reasoningText = (reasoningPart as { text?: string }).text;
    if (!reasoningText) {
      setThinkingStatus(null);
      return;
    }

    // Extract first bold text
    const extracted = extractFirstBold(reasoningText);
    if (extracted) {
      setThinkingStatus(extracted);
    }
  }, [messages, status, setThinkingStatus]);
}
