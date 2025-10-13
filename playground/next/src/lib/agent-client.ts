import { createAgentClient, useChatStore } from "agent-stack/client";

export const { client, useChat } = createAgentClient();
export { useChatStore };
