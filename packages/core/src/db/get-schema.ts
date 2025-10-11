/* agent-frontmatter:start
AGENT: Adapter schema normalizer
PURPOSE: Convert logical table definitions into adapter-friendly metadata
USAGE: const schema = getSchema(options)
EXPORTS: getSchema
FEATURES:
  - Resolves model and field names after user overrides
  - Normalizes foreign key references for migration helpers
SEARCHABLE: adapter schema, normalize tables, getSchema
agent-frontmatter:end */

import type { AgentStackOptions } from "../types";
import { type FieldAttribute, getAuthTables } from ".";

export function getSchema(config: Omit<AgentStackOptions, "agents">): Record<
  string,
  {
    modelName: string;
    fields: Record<string, FieldAttribute>;
    order: number;
  }
> {
  const tables = getAuthTables(config);
  const schema: Record<
    string,
    {
      modelName: string;
      fields: Record<string, FieldAttribute>;
      order: number;
    }
  > = {};
  for (const key in tables) {
    const table = tables[key];
    if (!table) continue;

    const fields = table.fields;
    const actualFields: Record<string, FieldAttribute> = {};
    Object.entries(fields).forEach(([key, field]) => {
      actualFields[field.fieldName || key] = field;
      if (field.references) {
        const refTable = tables[field.references.model];
        if (refTable) {
          const actualRef = actualFields[field.fieldName || key]?.references;
          if (actualRef) {
            actualRef.model = refTable.modelName;
            actualRef.field = field.references.field;
          }
        }
      }
    });

    const existingEntry = schema[table.modelName];
    if (existingEntry) {
      existingEntry.fields = {
        ...existingEntry.fields,
        ...actualFields,
      };
      continue;
    }
    schema[table.modelName] = {
      modelName: table.modelName,
      fields: actualFields,
      // biome-ignore lint/suspicious/noExplicitAny: is fine
      order: (table as any).order || Infinity,
    };
  }
  return schema;
}
