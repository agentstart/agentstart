/* agent-frontmatter:start
AGENT: Memory adapter re-export
PURPOSE: Re-exports Prisma memory adapter from @agentstart/memory
USAGE: import { prismaMemoryAdapter } from "agentstart/memory/prisma"
EXPORTS: prismaMemoryAdapter, Prisma types
FEATURES:
  - Granular import to avoid bundling unused adapters
  - Only loads Prisma-specific dependencies
SEARCHABLE: memory, prisma, adapter, re-export
agent-frontmatter:end */

export * from "@agentstart/memory/prisma";
