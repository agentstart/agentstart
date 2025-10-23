/* agent-frontmatter:start
AGENT: Playground configuration
PURPOSE: Configures Drizzle Kit for the sample Next.js project.
USAGE: Consumed by drizzle-kit CLI when generating migrations.
EXPORTS: default
FEATURES:
  - Loads environment variables for database credentials
  - Points Drizzle to the playground schema entrypoint
SEARCHABLE: playground, next, drizzle, config
agent-frontmatter:end */

import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
