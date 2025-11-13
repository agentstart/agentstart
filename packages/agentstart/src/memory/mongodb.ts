/* agent-frontmatter:start
AGENT: Memory adapter re-export
PURPOSE: Re-exports MongoDB memory adapter from @agentstart/memory
USAGE: import { mongodbMemoryAdapter } from "agentstart/memory/mongodb"
EXPORTS: mongodbMemoryAdapter, MongoDB types
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads MongoDB-specific dependencies
SEARCHABLE: memory, mongodb, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/mongodb";
