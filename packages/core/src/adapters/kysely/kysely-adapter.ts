/* agent-frontmatter:start
AGENT: Kysely adapter
PURPOSE: Provide a database adapter implementation backed by Kysely
USAGE: kyselyAdapter(db, { provider: "postgresql" })
EXPORTS: kyselyAdapter
FEATURES:
  - Builds dynamic queries using Kysely's expression helpers
  - Falls back gracefully when dialects lack returning support
  - Reuses shared where/sort normalization logic
SEARCHABLE: kysely adapter, database adapter, sql integration
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";
import { type DeleteResult, type Kysely, sql, type UpdateResult } from "kysely";
import {
  type AdapterCountArgs,
  type AdapterCreateArgs,
  type AdapterDebugLogger,
  type AdapterDeleteArgs,
  type AdapterFindManyArgs,
  type AdapterFindOneArgs,
  type AdapterUpdateArgs,
  type AdapterUpdateManyArgs,
  type AdapterUpsertArgs,
  createAdapterFactory,
  type DatabaseAdapterMethods,
} from "../create-database-adapter";
import {
  type AdapterWhereCondition,
  applyInputTransforms,
  camelToSnake,
  createDebugLoggerHook,
  ensureArrayValue,
  normalizeSortInput,
  normalizeWhereInput,
  pluralizeModel,
  splitWhereConditions,
} from "../shared";

type KyselyProvider =
  | "sqlite"
  | "postgresql"
  | "mysql"
  | "cockroachdb"
  | "mssql";

export interface KyselyAdapterUserOptions {
  provider: KyselyProvider;
  usePlural?: boolean;
  camelCase?: boolean;
  debug?:
    | boolean
    | {
        logger?: AdapterDebugLogger;
      };
  transaction?: boolean;
}

type GenericDatabase = Record<string, Record<string, unknown>>;
type TableKey = keyof GenericDatabase;

interface KyselyAdapterResolvedOptions extends KyselyAdapterUserOptions {
  db: Kysely<GenericDatabase>;
}

function toTableKey(table: string): TableKey {
  return table as TableKey;
}

function buildComparisonSnippet(
  table: string,
  field: string,
  operator: AdapterWhereCondition["operator"],
  value: unknown,
): ReturnType<typeof sql<boolean>> {
  // Kysely expects raw SQL fragments for dynamic filters. We lean on helper
  // snippets to keep driver interop readable.
  const columnRef = sql.ref(`${table}.${field}`);
  switch (operator) {
    case "ne":
      return sql<boolean>`${columnRef} <> ${value}`;
    case "lt":
      return sql<boolean>`${columnRef} < ${value}`;
    case "lte":
      return sql<boolean>`${columnRef} <= ${value}`;
    case "gt":
      return sql<boolean>`${columnRef} > ${value}`;
    case "gte":
      return sql<boolean>`${columnRef} >= ${value}`;
    case "contains":
      return sql<boolean>`${columnRef} like ${`%${String(value)}%`}`;
    case "starts_with":
      return sql<boolean>`${columnRef} like ${`${String(value)}%`}`;
    case "ends_with":
      return sql<boolean>`${columnRef} like ${`%${String(value)}`}`;
    case "in": {
      const values = ensureArrayValue({ field, value, operator });
      if (values.length === 0) {
        return sql<boolean>`1 = 0`;
      }
      return sql<boolean>`${columnRef} in (${sql.join(values.map((entry) => sql.val(entry)))})`;
    }
    case "not_in": {
      const values = ensureArrayValue({ field, value, operator });
      if (values.length === 0) {
        return sql<boolean>`1 = 1`;
      }
      return sql<boolean>`${columnRef} not in (${sql.join(values.map((entry) => sql.val(entry)))})`;
    }
    case undefined:
    case "eq":
      return sql<boolean>`${columnRef} = ${value}`;
    default: {
      const exhaustive: never = operator;
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        `Unsupported operator "${String(exhaustive)}" supplied for Kysely adapter.`,
      );
    }
  }
}

function buildSqlCondition(
  table: string,
  condition: AdapterWhereCondition,
  fieldNormalizer: (field: string) => string,
): ReturnType<typeof sql<boolean>> {
  const fieldName = fieldNormalizer(condition.field);
  return buildComparisonSnippet(
    table,
    fieldName,
    condition.operator,
    condition.value,
  );
}

function combineExpressions(
  expressions: Array<ReturnType<typeof sql<boolean>>>,
  operator: "AND" | "OR",
): ReturnType<typeof sql<boolean>> | undefined {
  if (expressions.length === 0) {
    return undefined;
  }
  if (expressions.length === 1) {
    return expressions[0]!;
  }
  const separator = operator === "AND" ? sql` AND ` : sql` OR `;
  return sql<boolean>`(${sql.join(expressions, separator)})`;
}

function buildWhereExpression(
  table: string,
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): ReturnType<typeof sql<boolean>> | undefined {
  if (conditions.length === 0) {
    return undefined;
  }

  const { andConditions, orConditions } = splitWhereConditions(conditions);
  const andParts = andConditions.map((condition) =>
    buildSqlCondition(table, condition, fieldNormalizer),
  );
  const orParts = orConditions.map((condition) =>
    buildSqlCondition(table, condition, fieldNormalizer),
  );

  const andExpression = combineExpressions(andParts, "AND");
  const orExpression = combineExpressions(orParts, "OR");

  if (andExpression && orExpression) {
    return sql<boolean>`(${andExpression}) AND (${orExpression})`;
  }

  return andExpression ?? orExpression ?? undefined;
}

function isEqualityCondition(condition: AdapterWhereCondition): boolean {
  const operator = condition.operator ?? "eq";
  if (operator !== "eq") {
    return false;
  }
  return condition.connector !== "OR";
}

function resolveConflictFields(
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): string[] | null {
  if (conditions.length === 0) {
    return null;
  }
  if (!conditions.every(isEqualityCondition)) {
    return null;
  }
  const fields = conditions.map((condition) =>
    fieldNormalizer(condition.field),
  );
  if (fields.length === 0) {
    return null;
  }
  const unique = new Set(fields);
  // `onConflict` requires stable ordering. Preserve original order by filtering
  // duplicates while respecting first occurrence.
  return fields.filter((field) => {
    if (!unique.has(field)) {
      return false;
    }
    unique.delete(field);
    return true;
  });
}

const baseKyselyAdapter = createAdapterFactory<KyselyAdapterResolvedOptions>({
  hooks: {
    logger: createDebugLoggerHook<KyselyAdapterResolvedOptions>("kysely"),
    normalizeModelName: ({ options, model }) =>
      options.usePlural ? pluralizeModel(model) : model,
    normalizeFieldName: ({ options, field }) =>
      options.camelCase ? camelToSnake(field) : field,
  },
  config: (options) => ({
    adapterId: "kysely",
    adapterName: "Kysely",
    usePlural: options.usePlural ?? false,
    supportsJSON: options.provider !== "mysql" && options.provider !== "mssql",
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: options.provider !== "sqlite",
  }),
  adapter: ({
    options,
    wrapOperation,
    normalizeModelName,
    normalizeFieldName,
    getFieldAttributes,
  }) => {
    const { db } = options;

    const executeSelect = async (
      tableName: string,
      where: AdapterWhereCondition[],
      limit?: number,
      offset?: number,
      order?: { field: string; direction: "asc" | "desc" } | undefined,
    ) => {
      const tableKey = toTableKey(tableName);
      let query = db.selectFrom(tableKey).selectAll();
      const expression = buildWhereExpression(tableName, where, (field) =>
        normalizeFieldName(tableName, field),
      );
      if (expression) {
        query = query.where(expression);
      }
      if (typeof limit === "number") {
        query = query.limit(limit);
      }
      if (typeof offset === "number") {
        query = query.offset(offset);
      }
      if (order) {
        const columnRef = sql.ref(
          `${tableName}.${normalizeFieldName(tableName, order.field)}`,
        );
        query = query.orderBy(columnRef, order.direction);
      }
      return query.execute();
    };

    const buildOperations = (
      client: Kysely<GenericDatabase>,
    ): DatabaseAdapterMethods => ({
      create: wrapOperation<AdapterCreateArgs, unknown>(
        "create",
        async ({ model, data, allowId }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const preparedData = applyInputTransforms({
            action: "create",
            model,
            data,
            allowId,
            getFieldAttributes,
          }) as Record<string, unknown>;
          try {
            const inserted = await client
              .insertInto(tableKey)
              .values(preparedData)
              .returningAll()
              .executeTakeFirst();
            if (inserted) {
              return inserted;
            }
          } catch {
            await client
              .insertInto(tableKey)
              .values(preparedData)
              .executeTakeFirst();
          }
          return preparedData;
        },
      ),
      upsert: wrapOperation<AdapterUpsertArgs, unknown>(
        "upsert",
        async ({ model, where, create, update }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const preparedCreate = applyInputTransforms({
            action: "create",
            model,
            data: create,
            getFieldAttributes,
          }) as Record<string, unknown>;
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Record<string, unknown>;
          const normalizedWhere = normalizeWhereInput(where);
          const expression = buildWhereExpression(
            tableName,
            normalizedWhere,
            (field) => normalizeFieldName(tableName, field),
          );

          const fetchCurrent = async () => {
            let query = client.selectFrom(tableKey).selectAll();
            if (expression) {
              query = query.where(expression);
            }
            return (await query.executeTakeFirst()) ?? null;
          };

          const conflictFields = resolveConflictFields(
            normalizedWhere,
            (field) => normalizeFieldName(tableName, field),
          );

          if (conflictFields && conflictFields.length > 0) {
            const insertBuilderBase = client
              .insertInto(tableKey)
              .values(preparedCreate);
            const upsertCapable =
              insertBuilderBase as typeof insertBuilderBase & {
                onConflict?: (
                  callback: (builder: {
                    columns(columns: string[]): {
                      doUpdateSet(
                        changes: Record<string, unknown>,
                      ): typeof insertBuilderBase;
                    };
                  }) => typeof insertBuilderBase,
                ) => typeof insertBuilderBase;
              };
            if (typeof upsertCapable.onConflict === "function") {
              const insertBuilder = upsertCapable.onConflict((oc) =>
                oc.columns(conflictFields).doUpdateSet(preparedUpdate),
              );
              try {
                const upserted = await insertBuilder
                  .returningAll()
                  .executeTakeFirst();
                if (upserted) {
                  return upserted;
                }
              } catch {
                await insertBuilder.executeTakeFirst();
              }
              const refetched = await fetchCurrent();
              if (refetched) {
                return refetched;
              }
              return { ...preparedCreate, ...preparedUpdate };
            }
          }

          const existing = await fetchCurrent();
          if (existing) {
            let builder = client.updateTable(tableKey).set(preparedUpdate);
            if (expression) {
              builder = builder.where(expression);
            }
            let updatedCount: number | undefined;
            try {
              const updated = await builder.returningAll().executeTakeFirst();
              if (updated) {
                return updated;
              }
            } catch {
              const outcome = (await builder.executeTakeFirst()) as
                | UpdateResult
                | undefined;
              if (outcome) {
                updatedCount = Number(outcome.numUpdatedRows);
              }
            }

            if (updatedCount === undefined || updatedCount > 0) {
              const refetched = await fetchCurrent();
              if (refetched) {
                return refetched;
              }
            }
          }

          const insertBuilder = client
            .insertInto(tableKey)
            .values(preparedCreate);
          try {
            const inserted = await insertBuilder
              .returningAll()
              .executeTakeFirst();
            if (inserted) {
              return inserted;
            }
          } catch {
            await insertBuilder.executeTakeFirst();
          }

          const refetched = await fetchCurrent();
          if (refetched) {
            return refetched;
          }
          return { ...preparedCreate, ...preparedUpdate };
        },
      ),
      findOne: wrapOperation<AdapterFindOneArgs, unknown | null>(
        "findOne",
        async ({ model, where }) => {
          const tableName = normalizeModelName(model);
          const normalizedWhere = normalizeWhereInput(where);
          const rows = await executeSelect(
            tableName,
            normalizedWhere,
            1,
            undefined,
            undefined,
          );
          return rows[0] ?? null;
        },
      ),
      findMany: wrapOperation<AdapterFindManyArgs, unknown[]>(
        "findMany",
        async ({ model, where, limit, offset, sortBy }) => {
          const tableName = normalizeModelName(model);
          const normalizedWhere = normalizeWhereInput(where);
          const [primarySort] = normalizeSortInput(sortBy);
          const order =
            primarySort?.field !== undefined
              ? {
                  field: primarySort.field,
                  direction: primarySort.direction ?? "asc",
                }
              : undefined;
          return executeSelect(
            tableName,
            normalizedWhere,
            limit,
            offset,
            order,
          );
        },
      ),
      count: wrapOperation<AdapterCountArgs, number>(
        "count",
        async ({ model, where }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          let query = db
            .selectFrom(tableKey)
            .select(({ fn }) => fn.countAll<number>().as("value"));
          const expression = buildWhereExpression(
            tableName,
            normalizeWhereInput(where),
            (field) => normalizeFieldName(tableName, field),
          );
          if (expression) {
            query = query.where(expression);
          }
          const result = await query.executeTakeFirst();
          return Number(result?.value ?? 0);
        },
      ),
      update: wrapOperation<AdapterUpdateArgs, unknown>(
        "update",
        async ({ model, where, update }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Record<string, unknown>;
          const expression = buildWhereExpression(
            tableName,
            normalizeWhereInput(where),
            (field) => normalizeFieldName(tableName, field),
          );

          let builder = db.updateTable(tableKey).set(preparedUpdate);
          if (expression) {
            builder = builder.where(expression);
          }
          try {
            const updated = await builder.returningAll().executeTakeFirst();
            if (updated) {
              return updated;
            }
          } catch {
            await builder.executeTakeFirst();
          }
          return null;
        },
      ),
      updateMany: wrapOperation<AdapterUpdateManyArgs, number>(
        "updateMany",
        async ({ model, where, update }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Record<string, unknown>;
          const expression = buildWhereExpression(
            tableName,
            normalizeWhereInput(where),
            (field) => normalizeFieldName(tableName, field),
          );
          let builder = db.updateTable(tableKey).set(preparedUpdate);
          if (expression) {
            builder = builder.where(expression);
          }
          try {
            const result = await builder.returningAll().execute();
            return result.length;
          } catch {
            const outcome = (await builder.executeTakeFirst()) as
              | UpdateResult
              | undefined;
            return outcome ? Number(outcome.numUpdatedRows) : 0;
          }
        },
      ),
      delete: wrapOperation<AdapterDeleteArgs, unknown>(
        "delete",
        async ({ model, where }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const expression = buildWhereExpression(
            tableName,
            normalizeWhereInput(where),
            (field) => normalizeFieldName(tableName, field),
          );
          let builder = db.deleteFrom(tableKey);
          if (expression) {
            builder = builder.where(expression);
          }
          try {
            const removed = await builder.returningAll().executeTakeFirst();
            if (removed) {
              return removed;
            }
          } catch {
            const outcome = (await builder.executeTakeFirst()) as
              | DeleteResult
              | undefined;
            if (outcome && Number(outcome.numDeletedRows) > 0) {
              return { deleted: true };
            }
          }
          return null;
        },
      ),
      deleteMany: wrapOperation<AdapterDeleteArgs, number>(
        "deleteMany",
        async ({ model, where }) => {
          const tableName = normalizeModelName(model);
          const tableKey = toTableKey(tableName);
          const expression = buildWhereExpression(
            tableName,
            normalizeWhereInput(where),
            (field) => normalizeFieldName(tableName, field),
          );
          let builder = db.deleteFrom(tableKey);
          if (expression) {
            builder = builder.where(expression);
          }
          try {
            const result = await builder.returningAll().execute();
            return result.length;
          } catch {
            const outcome = (await builder.executeTakeFirst()) as
              | DeleteResult
              | undefined;
            return outcome ? Number(outcome.numDeletedRows) : 0;
          }
        },
      ),
      options,
    });

    const baseOperations = buildOperations(db);
    const transaction =
      options.transaction && typeof db.transaction === "function"
        ? async <TReturn>(
            run: (
              adapter: DatabaseAdapterMethods,
            ) => Promise<TReturn> | TReturn,
          ) => {
            // Kysely exposes transactions through a helper that passes a new
            // db instance. Rebuild the adapter so nested calls stay consistent.
            return db.transaction().execute(async (trx) => {
              const nestedOperations = buildOperations(trx);
              return run(nestedOperations);
            });
          }
        : undefined;

    return transaction ? { ...baseOperations, transaction } : baseOperations;
  },
});

export function kyselyAdapter(
  db: Kysely<GenericDatabase>,
  options: KyselyAdapterUserOptions,
) {
  return baseKyselyAdapter({
    ...options,
    db,
  });
}
