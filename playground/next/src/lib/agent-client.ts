import {
  createAgentClient,
  useAgentStore,
  useChatStore,
} from "agent-stack/client";
export const { client, useChat } = createAgentClient();

export { useAgentStore, useChatStore };
