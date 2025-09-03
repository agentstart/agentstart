// AGENT: Database schema exports
// PURPOSE: Central export for all database table schemas
// SCHEMAS:
//   - auth: Authentication related tables (users, sessions, etc.)
// USAGE: import * as schema from '@acme/db/schema'
// CUSTOMIZATION: Add new schema exports here as you create tables
// SEARCHABLE: database schema, table definitions, drizzle schema

export * from "./auth";
