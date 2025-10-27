/* agent-frontmatter:start
AGENT: Agent persistence adapter
PURPOSE: Maps AgentStart CRUD operations onto Kysely query builders.
USAGE: Use when persisting agent data through Kysely with various SQL backends.
EXPORTS: kyselyAdapter
FEATURES:
  - Serializes values according to the configured SQL dialect
  - Hydrates query results back into AgentStart models
SEARCHABLE: packages, agentstart, src, db, adapter, kysely, persistence
agent-frontmatter:end */

/**
 * Kysely is a type-safe SQL query builder that works with various database drivers.
 * The Kysely<any> type parameter represents the database schema, which varies based on
 * the user's configuration and cannot be known at compile time in our adapter layer.
 *
 * This is a justified use of `any` because:
 * - Kysely's type system requires schema types that are user-defined
 * - Our adapter provides a generic interface that works with any Kysely instance
 * - Type safety is enforced through our transformation layer and schema validation
 * - The transform functions (transformValueToDB, transformValueFromDB) handle runtime type checking
 */

import type {
  AgentStartOptions,
  KyselyDatabaseType,
  MemoryAdapter,
  Where,
} from "@agentstart/types";
import { generateId } from "@agentstart/utils";
import {
  type InsertQueryBuilder,
  type Kysely,
  sql,
  type UpdateQueryBuilder,
} from "kysely";
import { getTables } from "../../get-tables";
import { createGetFieldFunction, validateTable } from "../shared";
import { withApplyDefault } from "../utils";

interface KyselyAdapterConfig {
  /**
   * Database type.
   */
  type?: KyselyDatabaseType;
}

const createTransform = (
  db: Kysely<any>,
  options: Omit<AgentStartOptions, "agent">,
  config?: KyselyAdapterConfig,
) => {
  const schema = getTables(options);
  const getField = createGetFieldFunction(schema, "kysely");

  function transformValueToDB(value: any, model: string, field: string) {
    if (field === "id") {
      return value;
    }
    const { type = "sqlite" } = config || {};
    const table = validateTable(schema, model, "kysely");
    const f = table.fields[field];
    if (!f) {
      throw new Error(`Field ${field} not found in table ${model}`);
    }
    if (
      f.type === "boolean" &&
      (type === "sqlite" || type === "mssql") &&
      value !== null &&
      value !== undefined
    ) {
      return value ? 1 : 0;
    }
    if (
      value !== null &&
      value !== undefined &&
      (f.type === "string[]" || f.type === "number[]" || Array.isArray(f.type))
    ) {
      if (type === "sqlite" || type === "mssql") {
        return JSON.stringify(value);
      }
      return value;
    }
    const isJsonField = f.type === "json";
    if (
      value !== null &&
      value !== undefined &&
      isJsonField
    ) {
      if (type === "sqlite" || type === "mssql" || type === "mysql") {
        return JSON.stringify(value);
      }
      return value;
    }
    if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      f.type === "string"
    ) {
      return JSON.stringify(value);
    }
    if (f.type === "date" && value && value instanceof Date) {
      return type === "sqlite" ? value.toISOString() : value;
    }
    return value;
  }

  function transformValueFromDB(value: any, model: string, field: string) {
    const { type = "sqlite" } = config || {};

    const table = validateTable(schema, model, "kysely");
    const f = table.fields[field];
    if (!f) {
      throw new Error(`Field ${field} not found in table ${model}`);
    }
    if (
      f.type === "boolean" &&
      (type === "sqlite" || type === "mssql") &&
      value !== null
    ) {
      return value === 1;
    }
    if (
      value !== null &&
      (f.type === "string[]" ||
        f.type === "number[]" ||
        Array.isArray(f.type)) &&
      typeof value === "string"
    ) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (
      typeof value === "string" &&
      (f.type === "string" || f.type === "json")
    ) {
      const firstChar = value.trim()[0];
      if (firstChar === "{" || firstChar === "[") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      if (
        f.type === "json" &&
        (type === "sqlite" || type === "mssql" || type === "mysql")
      ) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    }
    if (f.type === "json" && value && typeof value === "object") {
      return value;
    }
    if (f.type === "json" && Buffer.isBuffer(value)) {
      const text = value.toString("utf-8");
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    if (f.type === "date" && value) {
      return new Date(value);
    }
    return value;
  }

  function getModelName(model: string) {
    const table = validateTable(schema, model, "kysely");
    return table.modelName;
  }

  const useDatabaseGeneratedId = options?.advanced?.generateId === false;
  return {
    transformInput(
      data: Record<string, any>,
      model: string,
      action: "create" | "update",
    ) {
      const transformedData: Record<string, any> =
        useDatabaseGeneratedId || action === "update"
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
        const value = data[field];
        const fieldAttr = fields[field];
        if (!fieldAttr) {
          continue;
        }
        if (field === "id" && action === "create") {
          continue;
        }
        if (action === "update" && value === undefined) {
          continue;
        }
        if (value === undefined && fieldAttr.defaultValue === undefined) {
          continue;
        }
        transformedData[fieldAttr.fieldName || field] = withApplyDefault(
          transformValueToDB(value, model, field),
          fieldAttr,
          action,
        );
      }
      return transformedData;
    },
    transformOutput(
      data: Record<string, any>,
      model: string,
      select: string[] = [],
    ) {
      if (!data) return null;
      const transformedData: Record<string, any> = data.id
        ? select.length === 0 || select.includes("id")
          ? {
              id: data.id,
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
          transformedData[key] = transformValueFromDB(
            data[field.fieldName || key],
            model,
            key,
          );
        }
      }
      return transformedData as any;
    },
    convertWhereClause(model: string, w?: Where[]) {
      if (!w)
        return {
          and: null,
          or: null,
        };

      const conditions = {
        and: [] as any[],
        or: [] as any[],
      };

      w.forEach((condition) => {
        let {
          field: _field,
          value,
          operator = "=",
          connector = "AND",
        } = condition;
        const field = getField(model, _field);
        value = transformValueToDB(value, model, _field);
        const expr = (eb: any) => {
          if (operator.toLowerCase() === "in") {
            return eb(field, "in", Array.isArray(value) ? value : [value]);
          }

          if (operator === "contains") {
            return eb(field, "like", `%${value}%`);
          }

          if (operator === "starts_with") {
            return eb(field, "like", `${value}%`);
          }

          if (operator === "ends_with") {
            return eb(field, "like", `%${value}`);
          }

          if (operator === "eq") {
            return eb(field, "=", value);
          }

          if (operator === "ne") {
            return eb(field, "<>", value);
          }

          if (operator === "gt") {
            return eb(field, ">", value);
          }

          if (operator === "gte") {
            return eb(field, ">=", value);
          }

          if (operator === "lt") {
            return eb(field, "<", value);
          }

          if (operator === "lte") {
            return eb(field, "<=", value);
          }

          return eb(field, operator, value);
        };

        if (connector === "OR") {
          conditions.or.push(expr);
        } else {
          conditions.and.push(expr);
        }
      });

      return {
        and: conditions.and.length ? conditions.and : null,
        or: conditions.or.length ? conditions.or : null,
      };
    },
    async withReturning(
      values: Record<string, any>,
      builder:
        | InsertQueryBuilder<any, any, any>
        | UpdateQueryBuilder<any, string, string, any>,
      model: string,
      where: Where[],
    ) {
      let res: any;
      if (config?.type === "mysql") {
        //this isn't good, but kysely doesn't support returning in mysql and it doesn't return the inserted id. Change this if there is a better way.
        await builder.execute();
        const whereFirst = where[0];
        const field = values.id ? "id" : whereFirst?.field || "id";
        const value = values[field] || whereFirst?.value;
        res = await db
          .selectFrom(getModelName(model))
          .selectAll()
          .where(getField(model, field), "=", value)
          .executeTakeFirst();
        return res;
      }
      if (config?.type === "mssql") {
        res = await builder.outputAll("inserted").executeTakeFirst();
        return res;
      }
      res = await builder.returningAll().executeTakeFirst();
      return res;
    },
    getModelName,
    getField,
  };
};

export const kyselyAdapter =
  (db: Kysely<any>, config?: KyselyAdapterConfig) =>
  (opts: Omit<AgentStartOptions, "agent">) => {
    const {
      transformInput,
      withReturning,
      transformOutput,
      convertWhereClause,
      getModelName,
      getField,
    } = createTransform(db, opts, config);
    return {
      id: "kysely",
      async create(data) {
        const { model, data: values, select } = data;
        const transformed = transformInput(values, model, "create");
        const builder = db.insertInto(getModelName(model)).values(transformed);
        return transformOutput(
          await withReturning(transformed, builder, model, []),
          model,
          select,
        );
      },
      async findOne(data) {
        const { model, where, select } = data;
        const { and, or } = convertWhereClause(model, where);
        let query = db.selectFrom(getModelName(model)).selectAll();
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.executeTakeFirst();
        if (!res) return null;
        return transformOutput(res, model, select);
      },
      async findMany(data) {
        const { model, where, limit, offset, sortBy } = data;
        const { and, or } = convertWhereClause(model, where);
        let query = db.selectFrom(getModelName(model));
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        if (config?.type === "mssql") {
          if (!offset) {
            query = query.top(limit || 100);
          }
        } else {
          query = query.limit(limit || 100);
        }
        if (sortBy) {
          const columnRef = db.dynamic.ref(getField(model, sortBy.field));
          if ((config?.type ?? "sqlite") === "sqlite") {
            query = query.orderBy(
              sql`lower(${columnRef}) collate nocase`,
              sortBy.direction,
            );
          } else {
            query = query.orderBy(columnRef, sortBy.direction);
          }
        }
        if (offset) {
          if (config?.type === "mssql") {
            if (!sortBy) {
              query = query.orderBy(getField(model, "id"));
            }
            query = query.offset(offset).fetch(limit || 100);
          } else {
            query = query.offset(offset);
          }
        }

        const res = await query.selectAll().execute();
        if (!res) return [];
        return res.map((r) => transformOutput(r, model));
      },
      async update(data) {
        const { model, where, update: values } = data;
        const { and, or } = convertWhereClause(model, where);
        const transformedData = transformInput(values, model, "update");

        let query = db.updateTable(getModelName(model)).set(transformedData);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await transformOutput(
          await withReturning(transformedData, query, model, where),
          model,
        );
        return res;
      },
      async upsert(data) {
        const { model, where, create, update } = data;
        const tableName = getModelName(model);
        const { and, or } = convertWhereClause(model, where);
        const transformedUpdate = transformInput(update, model, "update");
        const firstWhere = where[0];
        const isSingleEquality =
          where.length === 1 &&
          firstWhere &&
          (!firstWhere.operator ||
            firstWhere.operator.toLowerCase() === "eq") &&
          (!firstWhere.connector || firstWhere.connector === "AND");
        const conflictColumnName = isSingleEquality
          ? getField(model, firstWhere.field)
          : undefined;
        const canUseNativeUpsert =
          Boolean(conflictColumnName) &&
          Object.keys(transformedUpdate).length > 0;

        if (canUseNativeUpsert) {
          const mergedCreate = { ...create, ...update };
          const transformedCreate = transformInput(
            mergedCreate,
            model,
            "create",
          );

          if (config?.type === "mysql") {
            const upsertBuilder = db
              .insertInto(tableName)
              .values(transformedCreate)
              .onDuplicateKeyUpdate(transformedUpdate);
            await upsertBuilder.execute();
            let refreshQuery = db.selectFrom(tableName).selectAll();
            if (and) {
              refreshQuery = refreshQuery.where((eb) =>
                eb.and(and.map((expr) => expr(eb))),
              );
            }
            if (or) {
              refreshQuery = refreshQuery.where((eb) =>
                eb.or(or.map((expr) => expr(eb))),
              );
            }
            const refreshed = await refreshQuery.executeTakeFirst();
            if (!refreshed) {
              return null;
            }
            return transformOutput(refreshed, model);
          }

          const upserted = await withReturning(
            transformedCreate,
            db
              .insertInto(tableName)
              .values(transformedCreate)
              .onConflict((oc) =>
                oc.column(conflictColumnName!).doUpdateSet(transformedUpdate),
              ),
            model,
            where,
          );
          return transformOutput(upserted, model);
        }

        let updateQuery = db.updateTable(tableName).set(transformedUpdate);
        if (and) {
          updateQuery = updateQuery.where((eb) =>
            eb.and(and.map((expr) => expr(eb))),
          );
        }
        if (or) {
          updateQuery = updateQuery.where((eb) =>
            eb.or(or.map((expr) => expr(eb))),
          );
        }

        const updated = await withReturning(
          transformedUpdate,
          updateQuery,
          model,
          where,
        );
        if (updated) {
          return transformOutput(updated, model);
        }

        const mergedCreate = { ...create, ...update };
        const transformedCreate = transformInput(mergedCreate, model, "create");
        const insertBuilder = db
          .insertInto(tableName)
          .values(transformedCreate);
        const created = await withReturning(
          transformedCreate,
          insertBuilder,
          model,
          [],
        );
        return transformOutput(created, model);
      },
      async updateMany(data) {
        const { model, where, update: values } = data;
        const { and, or } = convertWhereClause(model, where);
        const transformedData = transformInput(values, model, "update");
        let query = db.updateTable(getModelName(model)).set(transformedData);
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.execute();
        if (Array.isArray(res)) {
          const first = res[0] as { numUpdatedRows?: bigint } | undefined;
          if (first && typeof first.numUpdatedRows === "bigint") {
            return Number(first.numUpdatedRows);
          }
          return res.length;
        }
        if (
          res &&
          typeof (res as { numUpdatedRows?: bigint }).numUpdatedRows ===
            "bigint"
        ) {
          return Number((res as { numUpdatedRows?: bigint }).numUpdatedRows!);
        }
        if (typeof res === "number") {
          return res;
        }
        return 0;
      },
      async count(data) {
        const { model, where } = data;
        const { and, or } = convertWhereClause(model, where);
        let query = db
          .selectFrom(getModelName(model))
          // a temporal solution for counting other than "*" - see more - https://www.sqlite.org/quirks.html#double_quoted_string_literals_are_accepted
          .select(db.fn.count("id").as("count"));
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const res = await query.execute();
        const firstResult = res[0];
        if (!firstResult) {
          return 0;
        }
        return firstResult.count as number;
      },
      async delete(data) {
        const { model, where } = data;
        const { and, or } = convertWhereClause(model, where);
        let query = db.deleteFrom(getModelName(model));
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }

        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        await query.execute();
      },
      async deleteMany(data) {
        const { model, where } = data;
        const { and, or } = convertWhereClause(model, where);
        let query = db.deleteFrom(getModelName(model));
        if (and) {
          query = query.where((eb) => eb.and(and.map((expr) => expr(eb))));
        }
        if (or) {
          query = query.where((eb) => eb.or(or.map((expr) => expr(eb))));
        }
        const result = await query.execute();
        if (Array.isArray(result)) {
          const first = result[0] as { numDeletedRows?: bigint } | undefined;
          if (first && typeof first.numDeletedRows === "bigint") {
            return Number(first.numDeletedRows);
          }
          return result.length;
        }
        if (
          result &&
          typeof (result as { numDeletedRows?: bigint }).numDeletedRows ===
            "bigint"
        ) {
          return Number(
            (result as { numDeletedRows?: bigint }).numDeletedRows!,
          );
        }
        if (typeof result === "number") {
          return result;
        }
        return 0;
      },
      options: config,
    } satisfies MemoryAdapter;
  };
