/* agent-frontmatter:start
AGENT: Prisma adapter entry point
PURPOSE: Re-export the Prisma memory adapter for the AgentStart memory module.
USAGE: import { prismaMemoryAdapter } from "agentstart/memory"
EXPORTS: prismaMemoryAdapter
FEATURES:
  - Provides Prisma-based persistence wiring for agent memory
  - Normalizes query options for agent workloads
SEARCHABLE: packages, agentstart, src, memory, adapter, prisma, index
agent-frontmatter:end */

export * from "./prisma-adapter";
