// AGENT: Database package exports
// PURPOSE: Re-export commonly used Drizzle ORM utilities
// USAGE: import { sql, alias } from '@acme/db'
// SEARCHABLE: database exports, drizzle utilities

export * from "drizzle-orm/sql";
export { alias } from "drizzle-orm/pg-core";
