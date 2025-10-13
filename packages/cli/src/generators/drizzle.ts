/* agent-frontmatter:start
AGENT: Agent Stack CLI drizzle generator
PURPOSE: Produce Drizzle ORM schema files from Agent Stack metadata
USAGE: await generateDrizzleSchema({ adapter, options, file })
EXPORTS: generateDrizzleSchema
FEATURES:
  - Maps Agent Stack models into drizzle table definitions
  - Respects adapter options like provider and pluralization
  - Generates or updates agent schema files on demand
SEARCHABLE: drizzle schema, cli generator, database scaffolding
agent-frontmatter:end */

import { convertToSnakeCase } from "@agent-stack/utils";
import { type FieldAttribute, getTables } from "agent-stack/db";
import fs from "fs-extra";
import type { SchemaGenerator } from "./types";

type DrizzleProvider = "sqlite" | "pg" | "mysql";

export const generateDrizzleSchema: SchemaGenerator = async ({
  options,
  file,
  adapter,
}) => {
  const tables = getTables(options);
  const filePath = file ?? "./agent-schema.ts";

  const adapterOptions = (adapter.options ?? {}) as Partial<{
    provider: DrizzleProvider;
    usePlural: boolean;
  }>;
  const databaseType: DrizzleProvider = adapterOptions.provider ?? "sqlite";
  const usePlural = adapterOptions.usePlural ?? false;

  const importTokens: string[] = [];
  const useToken = (token: string) => {
    if (!importTokens.includes(token)) {
      importTokens.push(token);
    }
  };

  useToken(`${databaseType}Table`);

  const fileExist = fs.existsSync(filePath);

  // Map Agent Stack field metadata to drizzle column builders.
  const resolveField = (fieldName: string, field: FieldAttribute): string => {
    const dbName = convertToSnakeCase(fieldName);
    switch (field.type) {
      case "string": {
        if (databaseType === "mysql" && field.unique) {
          useToken("varchar");
          return `varchar('${dbName}', { length: 255 })`;
        }
        if (databaseType === "mysql" && field.references) {
          useToken("varchar");
          return `varchar('${dbName}', { length: 36 })`;
        }
        useToken("text");
        return `text('${dbName}')`;
      }
      case "boolean": {
        if (databaseType === "sqlite") {
          useToken("integer");
          return `integer('${dbName}', { mode: 'boolean' })`;
        }
        useToken("boolean");
        return `boolean('${dbName}')`;
      }
      case "number": {
        if (databaseType === "sqlite") {
          useToken("integer");
          return `integer('${dbName}')`;
        }
        if (field.bigint) {
          useToken("bigint");
          return `bigint('${dbName}', { mode: 'number' })`;
        }
        if (databaseType === "mysql") {
          useToken("int");
          return `int('${dbName}')`;
        }
        useToken("integer");
        return `integer('${dbName}')`;
      }
      case "date": {
        if (databaseType === "sqlite") {
          useToken("integer");
          return `integer('${dbName}', { mode: 'timestamp' })`;
        }
        useToken("timestamp");
        return `timestamp('${dbName}')`;
      }
      default: {
        if (field.type === "string[]") {
          useToken("text");
          return `text('${dbName}')`;
        }
        if (field.type === "number[]") {
          if (databaseType === "sqlite") {
            useToken("integer");
            return `integer('${dbName}')`;
          }
          if (databaseType === "mysql") {
            useToken("int");
            return `int('${dbName}')`;
          }
          useToken("integer");
          return `integer('${dbName}')`;
        }
        useToken("text");
        return `text('${dbName}')`;
      }
    }
  };

  const idLine = (() => {
    if (databaseType === "mysql") {
      useToken("varchar");
      return `varchar('id', { length: 36 }).primaryKey()`;
    }
    useToken("text");
    return `text('id').primaryKey()`;
  })();

  const tableBlocks: string[] = [];

  for (const [, table] of Object.entries(tables)) {
    const modelName = usePlural ? `${table.modelName}s` : table.modelName;
    const fieldLines = Object.entries(table.fields)
      .map(([fieldKey, attr]) => {
        if (fieldKey === "id") {
          return null;
        }
        const base = resolveField(fieldKey, attr);
        const notNull = attr.required ? ".notNull()" : "";
        const unique = attr.unique ? ".unique()" : "";
        const reference = attr.references
          ? `.references(() => ${
              usePlural ? `${attr.references.model}s` : attr.references.model
            }.${attr.references.field}, { onDelete: 'cascade' })`
          : "";
        return `  ${fieldKey}: ${base}${notNull}${unique}${reference},`;
      })
      .filter(Boolean) as string[];

    const schemaLines = [
      `export const ${modelName} = ${databaseType}Table("${convertToSnakeCase(
        modelName,
      )}", {`,
      `  id: ${idLine},`,
      ...fieldLines,
      `});`,
    ];

    tableBlocks.push(schemaLines.join("\n"));
  }

  const importLine = `import { ${importTokens.join(", ")} } from "drizzle-orm/${databaseType}-core";`;
  const code = `${importLine}\n\n${tableBlocks.join("\n\n")}\n`;

  return {
    code,
    fileName: filePath,
    overwrite: fileExist,
  };
};
