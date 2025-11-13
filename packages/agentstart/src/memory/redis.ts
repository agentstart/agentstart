/* agent-frontmatter:start
AGENT: Secondary memory adapter re-export
PURPOSE: Re-exports Redis secondary memory adapter from @agentstart/memory
USAGE: import { redisSecondaryMemoryAdapter } from "agentstart/memory/redis"
EXPORTS: redisSecondaryMemoryAdapter
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Redis-specific dependencies
SEARCHABLE: secondary memory, redis, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/redis";
