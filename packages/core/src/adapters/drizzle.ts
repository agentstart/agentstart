/* agent-frontmatter:start
AGENT: Drizzle ORM adapter
PURPOSE: Provide a database adapter implementation backed by Drizzle ORM
USAGE: drizzleAdapter(db, { provider: "pg" })
EXPORTS: drizzleAdapter
FEATURES:
  - Maps Agent Stack models to Drizzle tables
  - Converts rich where clauses into Drizzle expressions
  - Handles MySQL returning fallbacks without using `any`
SEARCHABLE: drizzle orm adapter, database adapter, storage integration
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";
import {
  type AnyColumn,
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  notInArray,
  or,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm";
import type { Table } from "drizzle-orm/table";
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
} from "./create-database-adapter";
import { createDebugLoggerHook } from "./debug";
import { camelToSnake, pluralizeModel } from "./naming";
import {
  type AdapterWhereCondition,
  ensureArrayValue,
  normalizeWhereInput,
  splitWhereConditions,
} from "./where";

type Provider = "sqlite" | "pg" | "mysql";

export interface DrizzleAdapterUserOptions {
  provider: Provider;
  schema?: Record<string, TableWithColumns | undefined>;
  usePlural?: boolean;
  camelCase?: boolean;
  debug?:
    | boolean
    | {
        logger?: AdapterDebugLogger;
      };
  transaction?: boolean;
}

interface DrizzleAdapterResolvedOptions extends DrizzleAdapterUserOptions {
  db: unknown;
}

interface InsertStatementConfig {
  values?: Array<Record<string, { value?: unknown }>>;
}

type ReturningCapableStatement<TRecord extends Record<string, unknown>> = {
  returning(): Promise<TRecord[]>;
  execute(): Promise<unknown>;
  config?: InsertStatementConfig;
};

type InsertStatement<TRecord extends Record<string, unknown>> =
  ReturningCapableStatement<TRecord>;

type UpdateStatement<TRecord extends Record<string, unknown>> =
  ReturningCapableStatement<TRecord> & {
    where(...conditions: Array<SQL | SQLWrapper>): UpdateStatement<TRecord>;
  };

type DeleteStatement<TRecord extends Record<string, unknown>> =
  ReturningCapableStatement<TRecord> & {
    where(...conditions: Array<SQL | SQLWrapper>): DeleteStatement<TRecord>;
  };

type InsertBuilder<TRecord extends Record<string, unknown>> = {
  values(values: Record<string, unknown>): InsertStatement<TRecord>;
};

type UpdateBuilder<TRecord extends Record<string, unknown>> = {
  set(values: Record<string, unknown>): UpdateStatement<TRecord>;
};

type SelectQuery<TRecord extends Record<string, unknown>> = Promise<
  TRecord[]
> & {
  where(...clause: Array<SQL | SQLWrapper>): SelectQuery<TRecord>;
  limit(limit: number): SelectQuery<TRecord>;
  offset(offset: number): SelectQuery<TRecord>;
  orderBy(...order: Array<SQL | SQLWrapper>): SelectQuery<TRecord>;
};

type SelectBuilder<TRecord extends Record<string, unknown>> = {
  from(table: Table): SelectQuery<TRecord>;
};

interface DrizzleExecutor {
  insert<TRecord extends Record<string, unknown>>(
    table: Table,
  ): InsertBuilder<TRecord>;
  update<TRecord extends Record<string, unknown>>(
    table: Table,
  ): UpdateBuilder<TRecord>;
  delete<TRecord extends Record<string, unknown>>(
    table: Table,
  ): DeleteStatement<TRecord>;
  select<TRecord extends Record<string, unknown> = Record<string, unknown>>(
    fields?: Record<string, unknown>,
  ): SelectBuilder<TRecord>;
  transaction?<TReturn>(
    run: (tx: DrizzleExecutor) => Promise<TReturn> | TReturn,
  ): Promise<TReturn>;
  _?: {
    fullSchema?: Record<string, TableWithColumns>;
  };
}

type TableWithColumns = Table & Record<string | symbol, unknown>;

const DRIZZLE_ORIGINAL_NAME = Symbol.for("drizzle:OriginalName");

// Resolve schema either from user-supplied map or drizzle metadata.
function extractSchema(
  options: DrizzleAdapterResolvedOptions,
): Record<string, TableWithColumns> {
  if (options.schema) {
    const filteredEntries = Object.entries(options.schema).filter(
      (entry): entry is [string, TableWithColumns] => entry[1] !== undefined,
    );
    return Object.fromEntries(filteredEntries);
  }

  const db = options.db as DrizzleExecutor;
  const fullSchema = db._?.fullSchema;
  if (fullSchema) {
    return fullSchema as Record<string, TableWithColumns>;
  }

  throw new AgentStackError(
    "DB_ADAPTER_SCHEMA_MISSING",
    "Provide a schema mapping or pass a Drizzle database with _.fullSchema available.",
  );
}

function resolveTable(
  model: string,
  options: DrizzleAdapterResolvedOptions,
): TableWithColumns {
  const schema = extractSchema(options);

  const direct = schema[model];
  if (direct) {
    return direct;
  }

  if (options.usePlural) {
    const candidates = [pluralizeModel(model), `${model}s`];
    for (const candidate of candidates) {
      const match = schema[candidate];
      if (match) {
        return match;
      }
    }
  }

  throw new AgentStackError(
    "DB_ADAPTER_TABLE_NOT_FOUND",
    `Unable to locate table for model "${model}". Add it to the schema map passed to drizzleAdapter.`,
  );
}

function tableName(table: TableWithColumns): string {
  const original = table[DRIZZLE_ORIGINAL_NAME];
  return typeof original === "string" ? original : table.toString();
}

function isAnyColumn(value: unknown): value is AnyColumn {
  return (
    typeof value === "object" &&
    value !== null &&
    "table" in (value as Record<string, unknown>)
  );
}

function ensureColumn(table: TableWithColumns, field: string): AnyColumn {
  const column = table[field];
  if (!isAnyColumn(column)) {
    throw new AgentStackError(
      "DB_ADAPTER_COLUMN_NOT_FOUND",
      `Column "${field}" not found on table "${tableName(table)}".`,
    );
  }
  return column;
}

function isEqualityCondition(condition: AdapterWhereCondition): boolean {
  const operator = condition.operator ?? "eq";
  if (operator !== "eq") {
    return false;
  }
  return condition.connector !== "OR";
}

function resolveConflictColumns(
  table: TableWithColumns,
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): AnyColumn[] | null {
  if (conditions.length === 0) {
    return null;
  }
  if (!conditions.every(isEqualityCondition)) {
    return null;
  }
  try {
    const columns = conditions.map((condition) =>
      ensureColumn(table, fieldNormalizer(condition.field)),
    );
    return columns.length === 0 ? null : columns;
  } catch {
    return null;
  }
}

function clauseForCondition(
  table: TableWithColumns,
  condition: AdapterWhereCondition,
  fieldNormalizer: (field: string) => string,
): SQL {
  const fieldName = fieldNormalizer(condition.field);
  const column = ensureColumn(table, fieldName);

  switch (condition.operator) {
    case "in":
      return inArray(column, ensureArrayValue(condition));
    case "not_in":
      return notInArray(column, ensureArrayValue(condition));
    case "contains":
      return like(column, `%${condition.value}%`);
    case "starts_with":
      return like(column, `${condition.value}%`);
    case "ends_with":
      return like(column, `%${condition.value}`);
    case "lt":
      return lt(column, condition.value);
    case "lte":
      return lte(column, condition.value);
    case "gt":
      return gt(column, condition.value);
    case "gte":
      return gte(column, condition.value);
    case "ne":
      return ne(column, condition.value);
    case "eq":
    case undefined:
      return eq(column, condition.value);
    default:
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        `Unsupported operator "${condition.operator as string}" supplied for field "${condition.field}".`,
      );
  }
}

function convertWhereClause(
  table: TableWithColumns,
  where: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): SQL[] {
  if (where.length === 0) {
    return [];
  }

  if (where.length === 1) {
    return [clauseForCondition(table, where[0]!, fieldNormalizer)];
  }

  const { andConditions, orConditions } = splitWhereConditions(where);

  const clauses: SQL[] = [];

  if (andConditions.length > 0) {
    const andClause = and(
      ...andConditions.map((entry) =>
        clauseForCondition(table, entry, fieldNormalizer),
      ),
    );
    if (andClause) {
      clauses.push(andClause);
    }
  }

  if (orConditions.length > 0) {
    const orClause = or(
      ...orConditions.map((entry) =>
        clauseForCondition(table, entry, fieldNormalizer),
      ),
    );
    if (orClause) {
      clauses.push(orClause);
    }
  }

  return clauses;
}

function validateFields(
  table: TableWithColumns,
  model: string,
  values: Record<string, unknown>,
  fieldNormalizer: (field: string) => string,
) {
  Object.keys(values).forEach((field) => {
    const resolved = fieldNormalizer(field);
    if (!(resolved in table)) {
      throw new AgentStackError(
        "DB_ADAPTER_COLUMN_NOT_FOUND",
        `Column "${resolved}" does not exist on table "${tableName(table)}" (model "${model}").`,
      );
    }
  });
}

async function resolveReturningRecord(
  db: DrizzleExecutor,
  table: TableWithColumns,
  _model: string,
  builder: ReturningCapableStatement<Record<string, unknown>>,
  values: Record<string, unknown>,
  where: AdapterWhereCondition[] | undefined,
  fieldNormalizer: (field: string) => string,
): Promise<Record<string, unknown> | null> {
  // Prefer the driver's native returning behaviour when supported.
  try {
    const result = await builder.returning();
    const first = result[0];
    if (first) {
      return first;
    }
  } catch {
    // MySQL and other providers without returning support will throw.
  }

  await builder.execute();

  // If returning is unsupported we pull a fresh copy using the primary key fallbacks.
  const updatedWhere =
    where?.map((entry) => ({
      ...entry,
      value: values[entry.field] ?? entry.value,
    })) ?? [];

  if (updatedWhere.length === 0) {
    const configValues = builder.config?.values?.[0];
    const idValue =
      configValues?.id?.value ??
      configValues?.ID?.value ??
      configValues?.Id?.value;
    if (idValue === undefined) {
      return null;
    }
    updatedWhere.push({
      field: "id",
      value: idValue,
      operator: "eq",
    });
  }

  const clause = convertWhereClause(table, updatedWhere, fieldNormalizer);
  let query = db.select<Record<string, unknown>>().from(table);
  if (clause.length > 0) {
    query = query.where(...clause);
  }
  query = query.limit(1);
  const fetched = await query;
  return fetched[0] ?? null;
}

const baseDrizzleAdapter = createAdapterFactory<DrizzleAdapterResolvedOptions>({
  hooks: {
    logger: createDebugLoggerHook<DrizzleAdapterResolvedOptions>("drizzle"),
    normalizeFieldName: ({ options, field }) =>
      options.camelCase ? camelToSnake(field) : field,
  },
  config: (options) => ({
    adapterId: "drizzle",
    adapterName: "Drizzle ORM",
    usePlural: options.usePlural ?? false,
    supportsJSON: options.provider !== "mysql",
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: options.provider !== "sqlite",
  }),
  adapter: ({
    options,
    wrapOperation,
    normalizeModelName,
    normalizeFieldName,
  }) => {
    const buildOperations = (
      currentDb: DrizzleExecutor,
      currentOptions: DrizzleAdapterResolvedOptions,
    ): DatabaseAdapterMethods => {
      return {
        create: wrapOperation<AdapterCreateArgs, unknown>(
          "create",
          async ({ model, data }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            validateFields(table, model, data, fieldNormalizer);
            const builder = currentDb
              .insert<Record<string, unknown>>(table)
              .values(data);
            return resolveReturningRecord(
              currentDb,
              table,
              model,
              builder,
              data,
              undefined,
              fieldNormalizer,
            );
          },
        ),
        upsert: wrapOperation<AdapterUpsertArgs, unknown>(
          "upsert",
          async ({ model, where, create, update }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            validateFields(table, model, create, fieldNormalizer);
            validateFields(table, model, update, fieldNormalizer);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            const mergedValues = { ...create, ...update };
            const conflictColumns = resolveConflictColumns(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            const insertBuilderBase = currentDb
              .insert<Record<string, unknown>>(table)
              .values(create);
            type UpsertCapableInsert = typeof insertBuilderBase & {
              onConflictDoUpdate?: (config: {
                target: AnyColumn | AnyColumn[];
                set: Record<string, unknown>;
              }) => InsertStatement<Record<string, unknown>>;
              onDuplicateKeyUpdate?: (config: {
                set: Record<string, unknown>;
              }) => InsertStatement<Record<string, unknown>>;
            };
            const insertBuilder = insertBuilderBase as UpsertCapableInsert;
            if (conflictColumns && conflictColumns.length > 0) {
              if (
                currentOptions.provider === "mysql" &&
                typeof insertBuilder.onDuplicateKeyUpdate === "function"
              ) {
                const upsertBuilder = insertBuilder.onDuplicateKeyUpdate({
                  set: update,
                });
                return resolveReturningRecord(
                  currentDb,
                  table,
                  model,
                  upsertBuilder,
                  mergedValues,
                  normalizedWhere,
                  fieldNormalizer,
                );
              }
              if (
                currentOptions.provider !== "mysql" &&
                typeof insertBuilder.onConflictDoUpdate === "function"
              ) {
                const target =
                  conflictColumns.length === 1
                    ? conflictColumns[0]!
                    : conflictColumns;
                const upsertBuilder = insertBuilder.onConflictDoUpdate({
                  target,
                  set: update,
                });
                return resolveReturningRecord(
                  currentDb,
                  table,
                  model,
                  upsertBuilder,
                  mergedValues,
                  normalizedWhere,
                  fieldNormalizer,
                );
              }
            }
            let query = currentDb.select<Record<string, unknown>>().from(table);
            if (clause.length > 0) {
              query = query.where(...clause);
            }
            query = query.limit(1);
            const existing = await query;
            if (existing[0]) {
              let builder = currentDb
                .update<Record<string, unknown>>(table)
                .set(update);
              if (clause.length > 0) {
                builder = builder.where(...clause);
              }
              return resolveReturningRecord(
                currentDb,
                table,
                model,
                builder,
                mergedValues,
                normalizedWhere,
                fieldNormalizer,
              );
            }
            return resolveReturningRecord(
              currentDb,
              table,
              model,
              insertBuilderBase,
              mergedValues,
              normalizedWhere,
              fieldNormalizer,
            );
          },
        ),
        findOne: wrapOperation<AdapterFindOneArgs, unknown | null>(
          "findOne",
          async ({ model, where }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let query = currentDb.select<Record<string, unknown>>().from(table);
            if (clause.length > 0) {
              query = query.where(...clause);
            }
            query = query.limit(1);
            const result = await query;
            return result[0] ?? null;
          },
        ),
        findMany: wrapOperation<AdapterFindManyArgs, unknown[]>(
          "findMany",
          async ({ model, where, sortBy, limit, offset }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let query = currentDb.select<Record<string, unknown>>().from(table);
            if (clause.length > 0) {
              query = query.where(...clause);
            }
            if (typeof limit === "number") {
              query = query.limit(limit);
            }
            if (typeof offset === "number") {
              query = query.offset(offset);
            }
            const [primarySort] = sortBy ?? [];
            if (primarySort?.field) {
              const resolvedField = fieldNormalizer(primarySort.field);
              const column = ensureColumn(table, resolvedField);
              const direction = primarySort.direction === "desc" ? desc : asc;
              query = query.orderBy(direction(column));
            }
            return query;
          },
        ),
        count: wrapOperation<AdapterCountArgs, number>(
          "count",
          async ({ model, where }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let query = currentDb
              .select<{ value: number }>({
                value: sql<number>`count(*)`,
              })
              .from(table);
            if (clause.length > 0) {
              query = query.where(...clause);
            }
            const result = await query;
            const first = result[0];
            return typeof first?.value === "number"
              ? first.value
              : Number(first?.value ?? 0);
          },
        ),
        update: wrapOperation<AdapterUpdateArgs, unknown>(
          "update",
          async ({ model, where, update }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            validateFields(table, model, update, fieldNormalizer);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let builder = currentDb
              .update<Record<string, unknown>>(table)
              .set(update);
            if (clause.length > 0) {
              builder = builder.where(...clause);
            }
            return resolveReturningRecord(
              currentDb,
              table,
              model,
              builder,
              update,
              normalizedWhere,
              fieldNormalizer,
            );
          },
        ),
        updateMany: wrapOperation<AdapterUpdateManyArgs, number>(
          "updateMany",
          async ({ model, where, update }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            validateFields(table, model, update, fieldNormalizer);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let builder = currentDb
              .update<Record<string, unknown>>(table)
              .set(update);
            if (clause.length > 0) {
              builder = builder.where(...clause);
            }
            try {
              const result = await builder.returning();
              return result.length;
            } catch {
              const executionResult = await builder.execute();
              if (typeof executionResult === "number") {
                return executionResult;
              }
              if (Array.isArray(executionResult)) {
                return executionResult.length;
              }
              return 0;
            }
          },
        ),
        delete: wrapOperation<AdapterDeleteArgs, unknown>(
          "delete",
          async ({ model, where }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let builder = currentDb.delete<Record<string, unknown>>(table);
            if (clause.length > 0) {
              builder = builder.where(...clause);
            }
            return resolveReturningRecord(
              currentDb,
              table,
              model,
              builder,
              {},
              normalizedWhere,
              fieldNormalizer,
            );
          },
        ),
        deleteMany: wrapOperation<AdapterDeleteArgs, number>(
          "deleteMany",
          async ({ model, where }) => {
            const modelName = normalizeModelName(model);
            const table = resolveTable(modelName, currentOptions);
            const fieldNormalizer = (field: string) =>
              normalizeFieldName(modelName, field);
            const normalizedWhere = normalizeWhereInput(where);
            const clause = convertWhereClause(
              table,
              normalizedWhere,
              fieldNormalizer,
            );
            let builder = currentDb.delete<Record<string, unknown>>(table);
            if (clause.length > 0) {
              builder = builder.where(...clause);
            }
            try {
              const result = await builder.returning();
              return result.length;
            } catch {
              const executionResult = await builder.execute();
              if (typeof executionResult === "number") {
                return executionResult;
              }
              if (Array.isArray(executionResult)) {
                return executionResult.length;
              }
              return 0;
            }
          },
        ),
        options: currentOptions,
      };
    };

    const db = options.db as DrizzleExecutor;
    const baseOperations = buildOperations(db, options);

    const transactionFn =
      typeof db.transaction === "function"
        ? db.transaction.bind(db)
        : undefined;

    // Expose a transaction helper only when the underlying driver supports it.
    const transaction =
      options.transaction && transactionFn
        ? async <TReturn>(
            run: (
              adapter: DatabaseAdapterMethods,
            ) => Promise<TReturn> | TReturn,
          ) => {
            return transactionFn(async (tx) => {
              const nestedOperations = buildOperations(tx, {
                ...options,
                db: tx,
                transaction: false,
              });
              return run(nestedOperations);
            });
          }
        : undefined;

    return transaction ? { ...baseOperations, transaction } : baseOperations;
  },
});

export function drizzleAdapter(
  db: unknown,
  options: DrizzleAdapterUserOptions,
) {
  return baseDrizzleAdapter({
    ...options,
    db,
  });
}
