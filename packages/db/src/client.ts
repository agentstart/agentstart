/* agent-frontmatter:start
AGENT: Database client initialization
PURPOSE: Initialize Drizzle ORM with Vercel Postgres
USAGE: import { db } from '@agent-stack/db/client'
FEATURES:
  - Vercel Postgres integration
  - Snake case column naming
  - Full schema type safety
COMMON TASKS:
  - db.query.users.findFirst()
  - db.insert(schema.users).values({...})
  - db.update(schema.users).set({...}).where(...)
SEARCHABLE: database client, drizzle client, postgres connection
agent-frontmatter:end */

import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import * as schema from "./schema";

export const db = drizzle({
  client: sql,
  schema,
  casing: "snake_case",
});
