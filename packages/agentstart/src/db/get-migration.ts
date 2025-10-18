/* agent-frontmatter:start
AGENT: Migration helper
PURPOSE: Generate Kysely migration helpers from adapter table metadata
USAGE: const migrations = await getMigrations(options)
EXPORTS: matchType, getMigrations
FEATURES:
  - Maps field definitions to SQL column types for multiple dialects
  - Produces helpers to run or compile schema migrations
SEARCHABLE: migration helper, kysely migration, adapter schema diff
agent-frontmatter:end */

import type {
  AlterTableColumnAlteringBuilder,
  CreateTableBuilder,
} from "kysely";
import { createKyselyAdapter } from "@/db/adapter/kysely/dialect";
import type { AgentStartOptions, KyselyDatabaseType } from "@/types";
import type { FieldAttribute, FieldType } from ".";
import { getSchema } from "./get-schema";

const postgresMap = {
  string: ["character varying", "text"],
  number: [
    "int4",
    "integer",
    "bigint",
    "smallint",
    "numeric",
    "real",
    "double precision",
  ],
  boolean: ["bool", "boolean"],
  date: ["timestamp", "date"],
};
const mysqlMap = {
  string: ["varchar", "text"],
  number: [
    "integer",
    "int",
    "bigint",
    "smallint",
    "decimal",
    "float",
    "double",
  ],
  boolean: ["boolean", "tinyint"],
  date: ["timestamp", "datetime", "date"],
};

const sqliteMap = {
  string: ["TEXT"],
  number: ["INTEGER", "REAL"],
  boolean: ["INTEGER", "BOOLEAN"], // 0 or 1
  date: ["DATE", "INTEGER"],
};

const mssqlMap = {
  string: ["text", "varchar"],
  number: ["int", "bigint", "smallint", "decimal", "float", "double"],
  boolean: ["bit", "smallint"],
  date: ["datetime", "date"],
};

const map = {
  postgres: postgresMap,
  mysql: mysqlMap,
  sqlite: sqliteMap,
  mssql: mssqlMap,
};

export function matchType(
  columnDataType: string,
  fieldType: FieldType,
  dbType: KyselyDatabaseType,
) {
  if (fieldType === "string[]" || fieldType === "number[]") {
    return columnDataType.toLowerCase().includes("json");
  }
  const types = map[dbType];
  const type = Array.isArray(fieldType)
    ? types.string.map((t) => t.toLowerCase())
    : types[fieldType].map((t) => t.toLowerCase());
  const matches = type.includes(columnDataType.toLowerCase());
  return matches;
}

export async function getMigrations(config: Omit<AgentStartOptions, "agent">) {
  const agentStartSchema = getSchema(config);

  let { kysely: db, databaseType: dbType } = await createKyselyAdapter(config);

  if (!dbType) {
    console.warn(
      "Could not determine database type, defaulting to sqlite. Please provide a type in the database options to avoid this.",
    );
    dbType = "sqlite";
  }

  if (!db) {
    console.error(
      "Only kysely adapter is supported for migrations. You can use `generate` command to generate the schema, if you're using a different adapter.",
    );
    process.exit(1);
  }
  const tableMetadata = await db.introspection.getTables();
  const toBeCreated: {
    table: string;
    fields: Record<string, FieldAttribute>;
    order: number;
  }[] = [];
  const toBeAdded: {
    table: string;
    fields: Record<string, FieldAttribute>;
    order: number;
  }[] = [];

  for (const [key, value] of Object.entries(agentStartSchema)) {
    const table = tableMetadata.find((t) => t.name === key);
    if (!table) {
      const tIndex = toBeCreated.findIndex((t) => t.table === key);
      const tableData = {
        table: key,
        fields: value.fields,
        order: value.order || Infinity,
      };

      const insertIndex = toBeCreated.findIndex(
        (t) => (t.order || Infinity) > tableData.order,
      );

      if (insertIndex === -1) {
        if (tIndex === -1) {
          toBeCreated.push(tableData);
        } else {
          const existingTable = toBeCreated[tIndex];
          if (existingTable) {
            existingTable.fields = {
              ...existingTable.fields,
              ...value.fields,
            };
          }
        }
      } else {
        toBeCreated.splice(insertIndex, 0, tableData);
      }
      continue;
    }
    const toBeAddedFields: Record<string, FieldAttribute> = {};
    for (const [fieldName, field] of Object.entries(value.fields)) {
      const column = table.columns.find((c) => c.name === fieldName);
      if (!column) {
        toBeAddedFields[fieldName] = field;
        continue;
      }

      if (matchType(column.dataType, field.type, dbType)) {
      } else {
        console.warn(
          `Field ${fieldName} in table ${key} has a different type in the database. Expected ${field.type} but got ${column.dataType}.`,
        );
      }
    }
    if (Object.keys(toBeAddedFields).length > 0) {
      toBeAdded.push({
        table: key,
        fields: toBeAddedFields,
        order: value.order || Infinity,
      });
    }
  }

  const migrations: (
    | AlterTableColumnAlteringBuilder
    | CreateTableBuilder<string, string>
  )[] = [];

  function getType(field: FieldAttribute) {
    const type = field.type;
    const typeMap = {
      string: {
        sqlite: "text",
        postgres: "text",
        mysql: field.unique
          ? "varchar(255)"
          : field.references
            ? "varchar(36)"
            : "text",
        mssql:
          field.unique || field.sortable
            ? "varchar(255)"
            : field.references
              ? "varchar(36)"
              : "text",
      },
      boolean: {
        sqlite: "integer",
        postgres: "boolean",
        mysql: "boolean",
        mssql: "smallint",
      },
      number: {
        sqlite: field.bigint ? "bigint" : "integer",
        postgres: field.bigint ? "bigint" : "integer",
        mysql: field.bigint ? "bigint" : "integer",
        mssql: field.bigint ? "bigint" : "integer",
      },
      date: {
        sqlite: "date",
        postgres: "timestamp",
        mysql: "datetime",
        mssql: "datetime",
      },
    } as const;
    if (dbType === "sqlite" && (type === "string[]" || type === "number[]")) {
      return "text";
    }
    if (type === "string[]" || type === "number[]") {
      return "jsonb";
    }
    if (Array.isArray(type)) {
      return "text";
    }
    // At this point, type must be one of the basic types
    const baseType = type as keyof typeof typeMap;
    const database = (dbType || "sqlite") as KyselyDatabaseType;
    return typeMap[baseType][database];
  }
  if (toBeAdded.length) {
    for (const table of toBeAdded) {
      for (const [fieldName, field] of Object.entries(table.fields)) {
        const type = getType(field);
        const exec = db.schema
          .alterTable(table.table)
          .addColumn(fieldName, type, (col) => {
            col = field.required !== false ? col.notNull() : col;
            if (field.references) {
              col = col.references(
                `${field.references.model}.${field.references.field}`,
              );
            }
            if (field.unique) {
              col = col.unique();
            }
            return col;
          });
        migrations.push(exec);
      }
    }
  }
  if (toBeCreated.length) {
    for (const table of toBeCreated) {
      let dbT = db.schema
        .createTable(table.table)
        .addColumn(
          "id",
          dbType === "mysql" || dbType === "mssql" ? "varchar(36)" : "text",
          (col) => col.primaryKey().notNull(),
        );

      for (const [fieldName, field] of Object.entries(table.fields)) {
        if (fieldName === "id") {
          continue;
        }
        const type = getType(field);
        dbT = dbT.addColumn(fieldName, type, (col) => {
          col = field.required !== false ? col.notNull() : col;
          if (field.references) {
            col = col.references(
              `${field.references.model}.${field.references.field}`,
            );
          }
          if (field.unique) {
            col = col.unique();
          }
          return col;
        });
      }
      migrations.push(dbT);
    }
  }
  async function runMigrations() {
    for (const migration of migrations) {
      await migration.execute();
    }
  }
  async function compileMigrations() {
    const compiled = migrations.map((m) => m.compile().sql);
    return `${compiled.join(";\n\n")};`;
  }
  return { toBeCreated, toBeAdded, runMigrations, compileMigrations };
}
