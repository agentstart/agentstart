/* agent-frontmatter:start
AGENT: Drizzle adapter entry point
PURPOSE: Re-export the Drizzle adapter for the AgentStart memory module.
USAGE: import { drizzleAdapter } from "agentstart/memory"
EXPORTS: drizzleAdapter, drizzleAdapterFactory
FEATURES:
  - Provides Drizzle-based persistence wiring for agent memory
  - Ensures typed integration with supported SQL drivers
SEARCHABLE: packages, agentstart, src, memory, adapter, drizzle, index
agent-frontmatter:end */

export * from "./drizzle-adapter";
