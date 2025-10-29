/* agent-frontmatter:start
AGENT: Prisma adapter entry point
PURPOSE: Re-export the Prisma adapter for the AgentStart memory module.
USAGE: import { prismaAdapter } from "agentstart/memory"
EXPORTS: prismaAdapter
FEATURES:
  - Provides Prisma-based persistence wiring for agent memory
  - Normalizes query options for agent workloads
SEARCHABLE: packages, agentstart, src, memory, adapter, prisma, index
agent-frontmatter:end */

export * from "./prisma-adapter";
