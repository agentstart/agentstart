/* agent-frontmatter:start
AGENT: Memory adapter runtime utilities
PURPOSE: Provide helper functions for initializing and transforming adapter data
USAGE: import { getAdapter } from "agentstart/memory/utils"
EXPORTS: getAdapter, convertToDB, convertFromDB
FEATURES:
  - Falls back to an in-memory adapter when no database is configured
  - Converts between logical field names and database column names
SEARCHABLE: memory adapter utils, getAdapter, field conversion
agent-frontmatter:end */

import type {
  AgentStartOptions,
  FieldAttribute,
  MemoryAdapter,
} from "@agentstart/types";
import { AgentStartError } from "@agentstart/utils";
import { getTables } from ".";
import { inMemoryAdapter } from "./memory/in-memory";
import { kyselyMemoryAdapter } from "./memory/kysely";
import { createKyselyAdapter } from "./memory/kysely/dialect";

export async function getAdapter(
  options: AgentStartOptions,
): Promise<MemoryAdapter> {
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
    return inMemoryAdapter(memoryDB)(options);
  }

  if (typeof options.memory === "function") {
    return options.memory(options);
  }

  const { kysely, databaseType } = await createKyselyAdapter(options);
  if (!kysely) {
    throw new AgentStartError(
      "DATABASE_ADAPTER_INIT_FAILED",
      "Failed to initialize database adapter",
    );
  }
  return kyselyMemoryAdapter(kysely, {
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
