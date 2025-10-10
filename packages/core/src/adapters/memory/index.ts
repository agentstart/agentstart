/* agent-frontmatter:start
AGENT: Memory adapter entry
PURPOSE: Re-export the in-memory adapter implementation
USAGE: import { memoryAdapter } from "@agent-stack/core/adapters/memory"
EXPORTS: memoryAdapter
FEATURES:
  - Keeps adapter API stable across refactors
  - Encapsulates folder structure details
SEARCHABLE: memory adapter entry, in-memory adapter
agent-frontmatter:end */

export * from "./memory-adapter";
