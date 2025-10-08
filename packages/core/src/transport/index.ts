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
