/* agent-frontmatter:start
AGENT: Adapter runtime utilities
PURPOSE: Provide helper functions for initializing and transforming adapter data
USAGE: import { getAdapter } from "agent-stack/db/utils"
EXPORTS: getAdapter, convertToDB, convertFromDB
FEATURES:
  - Falls back to an in-memory adapter when no database is configured
  - Converts between logical field names and database column names
SEARCHABLE: adapter utils, getAdapter, field conversion
agent-frontmatter:end */

import type { Adapter, AgentStackOptions } from "@agent-stack/types";
import { AgentStackError } from "@agent-stack/utils";
import { createKyselyAdapter } from "../adapter/kysely/dialect";
import { kyselyAdapter } from "../adapter/kysely/index";
import { memoryAdapter } from "../adapter/memory/index";
import { type FieldAttribute, getTables } from ".";

export async function getAdapter(options: AgentStackOptions): Promise<Adapter> {
  if (!options.memory) {
    const tables = getTables(options);
    const memoryDB = Object.keys(tables).reduce((acc, key) => {
      // @ts-expect-error
      acc[key] = [];
      return acc;
    }, {});
    console.warn(
      "No database configuration provided. Using memory adapter in development",
    );
    return memoryAdapter(memoryDB)(options);
  }

  if (typeof options.memory === "function") {
    return options.memory(options);
  }

  const { kysely, databaseType } = await createKyselyAdapter(options);
  if (!kysely) {
    throw new AgentStackError(
      "DATABASE_ADAPTER_INIT_FAILED",
      "Failed to initialize database adapter",
    );
  }
  return kyselyAdapter(kysely, {
    type: databaseType || "sqlite",
  })(options);
}

export function convertToDB<T extends Record<string, unknown>>(
  fields: Record<string, FieldAttribute>,
  values: T,
) {
  const result: Record<string, unknown> = {};
  const idValue = (values as Record<string, unknown>).id;
  if (idValue !== undefined) {
    result.id = idValue;
  }
  for (const key in fields) {
    const field = fields[key];
    if (!field) continue;
    const value = values[key];
    if (value === undefined) {
      continue;
    }
    result[field.fieldName || key] = value;
  }
  return result as T;
}

export function convertFromDB<T extends Record<string, unknown>>(
  fields: Record<string, FieldAttribute>,
  values: T | null,
) {
  if (!values) {
    return null;
  }
  const result: Record<string, unknown> = {
    id: (values as Record<string, unknown>).id,
  };
  for (const [key, value] of Object.entries(fields)) {
    result[key] = values[value.fieldName || key];
  }
  return result as T;
}
