/* agent-frontmatter:start
AGENT: Adapter exports
PURPOSE: Re-export database adapter helpers and built-in implementations
USAGE: Import from @agent-stack/core/adapters
EXPORTS: createAdapterFactory, drizzleAdapter
FEATURES:
  - Centralizes adapter exports
  - Keeps consumers decoupled from file structure
SEARCHABLE: database adapters, drizzle adapter, storage integration
agent-frontmatter:end */

export * from "./create-database-adapter";
export * from "./debug";
export * from "./drizzle";
export * from "./kysely";
export * from "./memory";
export * from "./mongodb";
export * from "./prisma";
export * from "./where";
