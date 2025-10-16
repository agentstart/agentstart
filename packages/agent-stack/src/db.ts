/* agent-frontmatter:start
AGENT: Agent Stack database exports
PURPOSE: Surface database helpers from the infra package through the main bundle
USAGE: import { getMigrationPlan } from "agent-stack/db"
EXPORTS: database helpers, schema utilities
FEATURES:
  - Re-exports infra database modules for consumers
  - Keeps DB layer colocated with the primary package entrypoints
SEARCHABLE: database exports, infra db, agent stack db
agent-frontmatter:end */

export * from "@agent-stack/infra/db";
