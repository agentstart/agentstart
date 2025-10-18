import {
  createAgentClient,
  useAgentStore,
  useThreadStore,
} from "agentstart/client";
export const { client, useThread } = createAgentClient();

export { useAgentStore, useThreadStore };
