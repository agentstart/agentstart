/* agent-frontmatter:start
AGENT: Kysely helper types
PURPOSE: Define shared enums and helpers for Kysely-based adapters
USAGE: import type { KyselyDatabaseType } from "agentstart"
EXPORTS: KyselyDatabaseType
FEATURES:
  - Central union of supported Kysely database dialect identifiers
SEARCHABLE: kysely database type, adapter dialect union
agent-frontmatter:end */

export type KyselyDatabaseType = "postgres" | "mysql" | "sqlite" | "mssql";
