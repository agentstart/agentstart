// AGENT: Database package exports
// PURPOSE: Re-export commonly used Drizzle ORM utilities
// USAGE: import { sql, eq, desc, asc, like, and } from '@acme/db'
// SEARCHABLE: database exports, drizzle utilities

export * from "drizzle-orm/sql";
export * from "drizzle-orm";
export { alias } from "drizzle-orm/pg-core";
