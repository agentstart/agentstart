/* agent-frontmatter:start
AGENT: Client entry point
PURPOSE: Re-export client-side hooks and stores for Agent Stack integrations
USAGE: import { useAgentStore, useThread } from \"@agent-stack/client\"
EXPORTS: useThread, useAgentStore, getAgentStore, configureAgentClient
FEATURES:
  - Surfaces Zustand stores for agent state management
  - Exposes thread synchronisation hooks
  - Provides client configuration helpers
SEARCHABLE: agent client, zustand store, thread hook
agent-frontmatter:end */

export * from "./agent-client";
export * from "./config";
export * from "./store";
export * from "./use-thread";
