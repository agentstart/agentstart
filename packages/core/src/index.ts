/* agent-frontmatter:start
AGENT: Root module exports
PURPOSE: Re-export core Agent Stack modules for consumers
USAGE: Import from @agent-stack/core to access adapters, agents, context, and transport
EXPORTS: adapters, agent, context, transport
FEATURES:
  - Serves as the primary entry point for Agent Stack consumers
SEARCHABLE: agent stack core exports, root module
agent-frontmatter:end */

export * from "./adapters";
export * from "./agent";
export * from "./context";
export * from "./create";
export * from "./integrations";
