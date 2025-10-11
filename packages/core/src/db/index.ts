/* agent-frontmatter:start
AGENT: Database helper exports
PURPOSE: Re-export shared database helpers for adapter implementations
USAGE: import { getAuthTables } from "@agent-stack/core/db"
EXPORTS: field helpers, getAuthTables, toZodSchema, getMigrations, getSchema, convert utilities, schema types
FEATURES:
  - Centralizes database helper exports for adapters and tests
  - Excludes plugin-specific helpers to keep API focused
SEARCHABLE: database helpers, adapter db exports, getAuthTables
agent-frontmatter:end */

export * from "./field";
export * from "./get-migration";
export * from "./get-schema";
export * from "./get-tables";
export * from "./schema";
export * from "./to-zod";
export * from "./utils";
