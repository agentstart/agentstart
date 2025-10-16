import { getMigrations } from "@agent-stack/infra/db";
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
      `./@agent-stack/core_migrations/${new Date()
        .toISOString()
        .replace(/:/g, "-")}.sql`,
  };
};
