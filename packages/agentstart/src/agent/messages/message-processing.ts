/* agent-frontmatter:start
AGENT: Message processing utilities
PURPOSE: Provide helper functions for normalizing model message payloads
USAGE: Import to clean or augment model message arrays before streaming
EXPORTS: fixEmptyUIMessages, addProviderOptionsToMessages
FEATURES:
  - Removes empty assistant messages left behind by tool executions
  - Applies provider options to targeted messages
SEARCHABLE: message processing, provider options, assistant message cleanup
agent-frontmatter:end */

import type { ModelMessage, UIMessage } from "ai";

/**
 * Filter out empty assistant messages
 * Empty assistant messages are created when the original message only contains tool calls
 * These can be safely removed as the tool messages themselves are preserved
 */
export function fixEmptyUIMessages(uiMessages: UIMessage[]): UIMessage[] {
  return uiMessages.reduce<UIMessage[]>((acc, message) => {
    // Strip blank text parts and redacted reasoning snippets that occasionally linger after tool runs
    const nonEmptyParts = (message.parts ?? []).filter((part) => {
      if (part.type === "text") {
        return Boolean(part.text.trim());
      }
      if (part.type === "reasoning") {
        return part.text !== "[REDACTED]" && part.state !== "done";
      }
      return true;
    });

    if (nonEmptyParts.length === 0) {
      return acc;
    }

    if (message.parts && nonEmptyParts.length === message.parts.length) {
      acc.push(message);
      return acc;
    }

    acc.push({
      ...message,
      parts: nonEmptyParts,
    });

    return acc;
  }, []);
}

/**
 * Add providerOptions to the last system, tool, and user/assistant messages
 */
export function addProviderOptionsToMessages(
  messages: ModelMessage[],
  providerOptions: NonNullable<ModelMessage["providerOptions"]>,
): ModelMessage[] {
  const applyProviderOptions = (index: number) => {
    if (index === -1) {
      return;
    }
    const message = messages[index];
    if (!message) {
      return;
    }
    messages[index] = {
      ...message,
      providerOptions,
    };
  };

  // Find the last occurrence of each message type
  let lastSystemIndex = -1;
  let lastToolIndex = -1;
  let lastUserOrAssistantIndex = -1;

  messages.forEach((message, index) => {
    if (message.role === "system") {
      lastSystemIndex = index;
    } else if (message.role === "tool") {
      lastToolIndex = index;
    } else if (message.role === "user" || message.role === "assistant") {
      lastUserOrAssistantIndex = index;
    }
  });

  // Apply providerOptions to the identified messages
  applyProviderOptions(lastSystemIndex);
  applyProviderOptions(lastToolIndex);

  if (lastUserOrAssistantIndex !== -1) {
    // Only add if it's not already added (in case it's the same as system or tool)
    if (
      lastUserOrAssistantIndex !== lastSystemIndex &&
      lastUserOrAssistantIndex !== lastToolIndex
    ) {
      applyProviderOptions(lastUserOrAssistantIndex);
    }
  }

  return messages;
}
