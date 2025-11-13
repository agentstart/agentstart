/* agent-frontmatter:start
AGENT: Memory adapter re-export
PURPOSE: Re-exports Kysely memory adapter from @agentstart/memory
USAGE: import { kyselyMemoryAdapter } from "agentstart/memory/kysely"
EXPORTS: kyselyMemoryAdapter, Kysely types
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Kysely-specific dependencies
SEARCHABLE: memory, kysely, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/kysely";
