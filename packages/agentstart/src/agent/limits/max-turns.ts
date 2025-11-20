/* agent-frontmatter:start
AGENT: Conversation limit helpers
PURPOSE: Provide shared utilities for enforcing max-turn chat constraints
USAGE: Import normalizeMaxTurns and countAssistantTurns to guard thread runs
EXPORTS: normalizeMaxTurns, countAssistantTurns
FEATURES:
  - Normalizes arbitrary max turn inputs into positive integers
  - Counts assistant responses in a UI message collection
SEARCHABLE: max turns, conversation limits, assistant turn counter
agent-frontmatter:end */

import type { AgentStartUIMessage } from "@/agent/messages";

export function normalizeMaxTurns(value?: number): number | null {
  if (typeof value !== "number") {
    return null;
  }

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

export function countAssistantTurns(messages: AgentStartUIMessage[]): number {
  return messages.reduce((total, message) => {
    return message.role === "assistant" ? total + 1 : total;
  }, 0);
}
