/* agent-frontmatter:start
AGENT: Playground agent client
PURPOSE: Creates AgentStart client hooks for the playground front-end.
USAGE: Import to gain client, useThread, and store selectors in components.
EXPORTS: useAgentStore, useThreadStore
FEATURES:
  - Initializes agent client with default configuration
  - Re-exports agent and thread stores for convenience
SEARCHABLE: playground, next, src, lib, agent, client, hooks
agent-frontmatter:end */

import {
  createAgentClient,
  useAgentStore,
  useThreadStore,
} from "agentstart/client";
export const { client, useThread } = createAgentClient();

export { useAgentStore, useThreadStore };
