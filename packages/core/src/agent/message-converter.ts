import type { ModelMessage, UIMessage } from "ai";

export async function getCompleteMessages<Message extends UIMessage>(
  message: Message,
  chatId: string,
): Promise<Message[] | undefined> {
  // Delete any messages after this one (for regeneration scenarios)
  // await deleteMessagesAfter(chatId, message.id);
  // create or update last message in database
  // await upsertMessage({ chatId, id: message.id, message });
  // load the previous messages from the server:
  // const messages = await loadChat(chatId);
  // return messages;
  return undefined;
}

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
