/* agent-frontmatter:start
AGENT: Message processing utilities
PURPOSE: Provide helper functions for normalizing model message payloads
USAGE: Import to clean or augment model message arrays before streaming
EXPORTS: fixEmptyModelMessages, addProviderOptionsToMessages
FEATURES:
  - Removes empty assistant messages left behind by tool executions
  - Applies provider options to targeted messages
SEARCHABLE: message processing, provider options, assistant message cleanup
agent-frontmatter:end */

import type { ModelMessage } from "ai";

/**
 * Filter out empty assistant messages
 * Empty assistant messages are created when the original message only contains tool calls
 * These can be safely removed as the tool messages themselves are preserved
 */
export function fixEmptyModelMessages(
  convertedMessages: ModelMessage[],
): ModelMessage[] {
  return convertedMessages.filter((msg) => {
    // Remove empty assistant messages
    if (msg.role === "assistant" && (msg.content === "" || !msg.content)) {
      return false;
    }
    return true;
  });
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
