/* agent-frontmatter:start
AGENT: In-memory adapter entry point
PURPOSE: Re-export the in-memory adapter for the AgentStart memory module.
USAGE: import { memoryAdapter } from "agentstart/memory"
EXPORTS: memoryAdapter
FEATURES:
  - Provides a zero-dependency adapter for ephemeral memory
  - Useful for testing and local prototyping scenarios
SEARCHABLE: packages, agentstart, src, memory, adapter, memory, index
agent-frontmatter:end */

export * from "./memory-adapter";
