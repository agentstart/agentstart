/* agent-frontmatter:start
AGENT: Memory adapter re-export
PURPOSE: Re-exports Drizzle memory adapter from @agentstart/memory
USAGE: import { drizzleMemoryAdapter } from "agentstart/memory/drizzle"
EXPORTS: drizzleMemoryAdapter, Drizzle types
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Drizzle-specific dependencies
SEARCHABLE: memory, drizzle, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/drizzle";
