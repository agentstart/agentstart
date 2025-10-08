/* agent-frontmatter:start
AGENT: Drizzle ORM configuration
PURPOSE: Configure Drizzle for database migrations and schema management
USAGE: Used by drizzle-kit CLI commands
COMMANDS:
  - bun db:push - Push schema to database
  - bun db:migrate - Run migrations
  - bun db:studio - Open Drizzle Studio
REQUIRES: POSTGRES_URL environment variable
SEARCHABLE: drizzle config, database config, migration config
agent-frontmatter:end */

import type { Config } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL");
}

/* agent-frontmatter:start
AGENT: Drizzle configuration object
CUSTOMIZATION: Modify schema path or dialect as needed
agent-frontmatter:end */
export default {
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL },
  casing: "snake_case", // Use snake_case for database columns
} satisfies Config;
