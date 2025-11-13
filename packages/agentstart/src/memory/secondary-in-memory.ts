/* agent-frontmatter:start
AGENT: Secondary memory adapter re-export
PURPOSE: Re-exports in-memory secondary memory adapter from @agentstart/memory
USAGE: import { inMemorySecondaryMemoryAdapter } from "agentstart/memory/secondary-in-memory"
EXPORTS: inMemorySecondaryMemoryAdapter
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Lightweight in-memory secondary storage
SEARCHABLE: secondary memory, in-memory, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/secondary-in-memory";
