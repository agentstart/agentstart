/* agent-frontmatter:start
AGENT: CLI generator module
PURPOSE: Generates SQL migration files using Kysely schema tooling.
USAGE: Called by the CLI when emitting database migrations for Kysely projects.
EXPORTS: generateMigrations
FEATURES:
  - Compiles migration statements via AgentStart migration helpers
  - Produces timestamped filenames for generated SQL
SEARCHABLE: packages, cli, src, generators, kysely, generator, migration
agent-frontmatter:end */

import { getMigrations } from "agentstart/memory";
import type { SchemaGenerator } from "./types";

export const generateMigrations: SchemaGenerator = async ({
  options,
  file,
}) => {
  const { compileMigrations } = await getMigrations(options);
  const migrations = await compileMigrations();
  return {
    code: migrations,
    fileName:
      file ||
      `./@agentstart/core_migrations/${new Date()
        .toISOString()
        .replace(/:/g, "-")}.sql`,
  };
};
