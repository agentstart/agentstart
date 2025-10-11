/* agent-frontmatter:start
AGENT: Adapters barrel export
PURPOSE: Central re-export point for all adapter implementations
USAGE: import { drizzleAdapter, kyselyAdapter, memoryAdapter, mongodbAdapter, prismaAdapter } from "../adapters"
EXPORTS: All adapter implementations and their utilities
FEATURES:
  - Re-exports all 5 adapter implementations
  - Includes adapter-specific types and utilities (e.g., Kysely dialect, types)
SEARCHABLE: adapter exports, drizzle kysely memory mongodb prisma
agent-frontmatter:end */

export * from "./drizzle-adapter";
export * from "./kysely-adapter";
export * from "./memory-adapter";
export * from "./mongodb-adapter";
export * from "./prisma-adapter";
