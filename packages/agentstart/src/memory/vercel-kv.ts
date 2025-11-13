/* agent-frontmatter:start
AGENT: Secondary memory adapter re-export
PURPOSE: Re-exports Vercel KV secondary memory adapter from @agentstart/memory
USAGE: import { vercelKvSecondaryMemoryAdapter } from "agentstart/memory/vercel-kv"
EXPORTS: vercelKvSecondaryMemoryAdapter
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Vercel KV-specific dependencies
SEARCHABLE: secondary memory, vercel kv, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/vercel-kv";
