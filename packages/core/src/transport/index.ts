/* agent-frontmatter:start
AGENT: Transport configuration
PURPOSE: Expose default transport used for streaming chat responses
USAGE: Import defaultTransport when wiring agent routes or handlers
EXPORTS: defaultTransport
FEATURES:
  - Maps outgoing messages into transport request payloads
SEARCHABLE: agent transport, chat transport, streaming configuration
agent-frontmatter:end */

import { DefaultChatTransport } from "ai";

export const defaultTransport = new DefaultChatTransport({
  // You must send the id of the chat
  prepareSendMessagesRequest: ({ id, messages }) => {
    return {
      body: {
        id,
        message: messages.at(-1),
      },
    };
  },
});
