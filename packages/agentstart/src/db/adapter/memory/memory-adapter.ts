/* agent-frontmatter:start
AGENT: Agent persistence adapter
PURPOSE: Implements an in-memory adapter satisfying the AgentStart persistence contract.
USAGE: Use for tests or ephemeral environments that do not require durable storage.
EXPORTS: MemoryDB, memoryAdapter
FEATURES:
  - Stores agent data in process-local maps
  - Implements query helpers for quick lookups and filtering
SEARCHABLE: packages, agentstart, src, db, adapter, memory, persistence
agent-frontmatter:end */

import { generateId } from "@agentstart/utils";
import { getTables } from "@/db";
import { withApplyDefault } from "@/db/adapter/utils";
import type { Adapter, AgentStartOptions, Where } from "@/types";

export type MemoryDB = Record<string, Array<Record<string, unknown>>>;

const toComparable = (value: unknown): string | number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return value;
  }
  return value === null || value === undefined ? "" : String(value);
};

const createTransform = (options: Omit<AgentStartOptions, "agent">) => {
  const schema = getTables(options);

  function getField(model: string, field: string): string {
    if (field === "id") {
      return field;
    }
    const table = schema[model];
    if (!table) {
      throw new Error(`Table ${model} not found in schema`);
    }
    const f = table.fields[field];
    if (!f) {
      throw new Error(`Field ${field} not found in table ${model}`);
    }
    return f.fieldName || field;
  }
  return {
    transformInput(
      data: Record<string, unknown>,
      model: string,
      action: "update" | "create",
    ): Record<string, unknown> {
      const transformedData: Record<string, unknown> =
        action === "update"
          ? {}
          : {
              id: options.advanced?.generateId
                ? options.advanced.generateId({
                    model,
                  })
                : data.id || generateId(),
            };

      const table = schema[model];
      if (!table) {
        throw new Error(`Table ${model} not found in schema`);
      }
      const fields = table.fields;
      for (const field in fields) {
        // Skip id field in create action as we've already handled it
        if (field === "id" && action === "create") {
          continue;
        }
        const value = data[field];
        const fieldAttr = fields[field];
        if (!fieldAttr) {
          continue;
        }
        if (action === "update" && value === undefined) {
          continue;
        }
        if (value === undefined && !fieldAttr.defaultValue) {
          continue;
        }
        transformedData[fieldAttr.fieldName || field] = withApplyDefault(
          value,
          fieldAttr,
          action,
        );
      }
      return transformedData;
    },
    transformOutput(
      data: Record<string, unknown> | null,
      model: string,
      select: string[] = [],
    ): Record<string, unknown> | null {
      if (!data) return null;
      const base = data as Record<string, unknown>;
      const databaseId =
        (base.id as string | undefined) ??
        (base._id as { toString: () => string } | undefined);
      const transformedData: Record<string, unknown> = databaseId
        ? select.length === 0 || select.includes("id")
          ? {
              id:
                typeof databaseId === "string"
                  ? databaseId
                  : databaseId?.toString(),
            }
          : {}
        : {};
      const table = schema[model];
      if (!table) {
        throw new Error(`Table ${model} not found in schema`);
      }
      const tableSchema = table.fields;
      for (const key in tableSchema) {
        if (select.length && !select.includes(key)) {
          continue;
        }
        const field = tableSchema[key];
        if (field) {
          transformedData[key] = base[field.fieldName || key];
        }
      }
      return transformedData;
    },
    convertWhereClause(
      where: Where[],
      table: Array<Record<string, unknown>>,
      model: string,
    ): Array<Record<string, unknown>> {
      return table.filter((record) => {
        return where.every((clause) => {
          const { field: _field, value, operator } = clause;
          const field = getField(model, _field);
          const recordValue = record[field];
          if (operator === "in") {
            if (!Array.isArray(value)) {
              throw new Error("Value must be an array");
            }
            return value.some((candidate) => candidate === recordValue);
          }
          if (operator === "contains") {
            return (
              typeof recordValue === "string" &&
              typeof value === "string" &&
              recordValue.includes(value)
            );
          }
          if (operator === "starts_with") {
            return (
              typeof recordValue === "string" &&
              typeof value === "string" &&
              recordValue.startsWith(value)
            );
          }
          if (operator === "ends_with") {
            return (
              typeof recordValue === "string" &&
              typeof value === "string" &&
              recordValue.endsWith(value)
            );
          }
          if (recordValue instanceof Date && value instanceof Date) {
            return recordValue.getTime() === value.getTime();
          }
          return recordValue === value;
        });
      });
    },
    getField,
  };
};

export const memoryAdapter =
  (db: MemoryDB = {}) =>
  (options: Omit<AgentStartOptions, "agent">) => {
    const { transformInput, transformOutput, convertWhereClause, getField } =
      createTransform(options);

    // Initialize tables if they don't exist
    const ensureTable = (model: string) => {
      if (!db[model]) {
        db[model] = [] as Array<Record<string, unknown>>;
      }
    };

    return {
      id: "memory",
      async create<T extends Record<string, unknown>, R = T>({
        model,
        data,
        select,
      }: {
        model: string;
        data: T;
        select?: string[];
      }): Promise<R> {
        ensureTable(model);
        const transformed = transformInput(data, model, "create");
        db[model]!.push(transformed);
        const output = transformOutput(transformed, model, select);
        if (!output) {
          throw new Error(`Failed to create record for model ${model}`);
        }
        return output as R;
      },
      async findOne<T>({
        model,
        where,
        select,
      }: {
        model: string;
        where: Where[];
        select?: string[];
      }): Promise<T | null> {
        ensureTable(model);
        const table = db[model]!;
        const res = convertWhereClause(where, table, model);
        const record = res[0] ?? null;
        const output = transformOutput(record, model, select);
        return output ? (output as T) : null;
      },
      async findMany<T>({
        model,
        where,
        sortBy,
        limit,
        offset,
      }: {
        model: string;
        where?: Where[];
        sortBy?: { field: string; direction: "asc" | "desc" };
        limit?: number;
        offset?: number;
      }): Promise<T[]> {
        ensureTable(model);
        let table = db[model]!;
        if (where?.length) {
          table = convertWhereClause(where, table, model);
        }
        if (sortBy) {
          table = table.sort((a, b) => {
            const field = getField(model, sortBy.field);
            const left = toComparable(a[field]);
            const right = toComparable(b[field]);
            if (sortBy.direction === "asc") {
              if (typeof left === "string" && typeof right === "string") {
                return left.localeCompare(right);
              }
              return (left as number) - (right as number);
            }
            if (typeof left === "string" && typeof right === "string") {
              return right.localeCompare(left);
            }
            return (right as number) - (left as number);
          });
        }
        if (offset !== undefined) {
          table = table.slice(offset);
        }
        if (limit !== undefined) {
          table = table.slice(0, limit);
        }
        const results = table
          .map((record) => transformOutput(record, model))
          .filter(
            (record): record is Record<string, unknown> => record !== null,
          );
        return results as T[];
      },
      async count({
        model,
        where,
      }: {
        model: string;
        where?: Where[];
      }): Promise<number> {
        ensureTable(model);
        if (!where?.length) {
          return db[model]!.length;
        }
        return convertWhereClause(where, db[model]!, model).length;
      },
      async update<T>({
        model,
        where,
        update,
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<T | null> {
        ensureTable(model);
        const table = db[model]!;
        const matches = convertWhereClause(where, table, model);
        if (!matches.length) {
          return null;
        }
        const transformedUpdate = transformInput(update, model, "update");
        matches.forEach((record) => {
          Object.assign(record, transformedUpdate);
        });
        const output = transformOutput(matches[0] ?? null, model);
        return output ? (output as T) : null;
      },
      async updateMany({
        model,
        where,
        update,
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<number> {
        ensureTable(model);
        const table = db[model]!;
        const matches = convertWhereClause(where, table, model);
        if (!matches.length) {
          return 0;
        }
        const transformedUpdate = transformInput(update, model, "update");
        matches.forEach((record) => {
          Object.assign(record, transformedUpdate);
        });
        return matches.length;
      },
      async delete({
        model,
        where,
      }: {
        model: string;
        where: Where[];
      }): Promise<void> {
        ensureTable(model);
        const table = db[model]!;
        const matches = convertWhereClause(where, table, model);
        db[model] = table.filter((record) => !matches.includes(record));
      },
      async deleteMany({
        model,
        where,
      }: {
        model: string;
        where: Where[];
      }): Promise<number> {
        ensureTable(model);
        const table = db[model]!;
        const matches = convertWhereClause(where, table, model);
        let count = 0;
        db[model] = table.filter((record) => {
          if (matches.includes(record)) {
            count++;
            return false;
          }
          return true;
        });
        return count;
      },
      async upsert<T>({
        model,
        where,
        create,
        update,
      }: {
        model: string;
        where: Where[];
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }): Promise<T | null> {
        ensureTable(model);
        const table = db[model]!;
        const matches = convertWhereClause(where, table, model);
        if (matches.length > 0) {
          const transformedUpdate = transformInput(update, model, "update");
          matches.forEach((record) => {
            Object.assign(record, transformedUpdate);
          });
          const output = transformOutput(matches[0] ?? null, model);
          return output ? (output as T) : null;
        }
        const merged = { ...create, ...update };
        const transformed = transformInput(merged, model, "create");
        db[model]!.push(transformed);
        const output = transformOutput(transformed, model);
        return output ? (output as T) : null;
      },
    } satisfies Adapter;
  };
