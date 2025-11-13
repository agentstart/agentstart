/* agent-frontmatter:start
AGENT: Secondary memory adapter re-export
PURPOSE: Re-exports Upstash secondary memory adapter from @agentstart/memory
USAGE: import { upstashSecondaryMemoryAdapter } from "agentstart/memory/upstash"
EXPORTS: upstashSecondaryMemoryAdapter
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Upstash-specific dependencies
SEARCHABLE: secondary memory, upstash, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/upstash";
