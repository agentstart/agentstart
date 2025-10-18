import { getMigrations } from "agentstart/db";
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
