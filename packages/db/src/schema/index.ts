/* agent-frontmatter:start
AGENT: Database schema exports
PURPOSE: Central export for all database table schemas
SCHEMAS:
  - auth: Authentication related tables (users, sessions, etc.)
  - feedback: User feedback system tables
USAGE: import * as schema from '@acme/db/schema'
CUSTOMIZATION: Add new schema exports here as you create tables
SEARCHABLE: database schema, table definitions, drizzle schema
agent-frontmatter:end */

export * from "./auth";
export * from "./feedback";
