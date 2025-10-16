import {
  createAgentClient,
  useAgentStore,
  useThreadStore,
} from "agent-stack/client";
export const { client, useThread } = createAgentClient();

export { useAgentStore, useThreadStore };
