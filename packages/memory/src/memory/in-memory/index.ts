/* agent-frontmatter:start
AGENT: In-memory adapter entry point
PURPOSE: Re-export the in-memory adapter for the AgentStart memory module.
USAGE: import { inMemoryAdapter } from "agentstart/memory"
EXPORTS: inMemoryAdapter
FEATURES:
  - Provides a zero-dependency adapter for ephemeral memory
  - Useful for testing and local prototyping scenarios
SEARCHABLE: packages, agentstart, src, memory, adapter, in-memory, index
agent-frontmatter:end */

export * from "./in-memory-adapter";
