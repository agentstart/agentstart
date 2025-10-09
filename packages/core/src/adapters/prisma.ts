/* agent-frontmatter:start
AGENT: Prisma adapter
PURPOSE: Provide a database adapter implementation backed by Prisma Client
USAGE: prismaAdapter(prisma, { provider: "postgresql" })
EXPORTS: prismaAdapter
FEATURES:
  - Translates normalized filters into Prisma where objects
  - Handles select/order/take/skip mappings
  - Supports transactional execution when available
SEARCHABLE: prisma adapter, database adapter, prisma integration
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";

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
  normalizeSortInput,
  normalizeWhereInput,
} from "./where";

type PrismaProvider =
  | "sqlite"
  | "cockroachdb"
  | "mysql"
  | "postgresql"
  | "sqlserver"
  | "mongodb";

export interface PrismaAdapterUserOptions {
  provider: PrismaProvider;
  modelMap?: Record<string, string>;
  usePlural?: boolean;
  camelCase?: boolean;
  debug?:
    | boolean
    | {
        logger?: AdapterDebugLogger;
      };
  transaction?: boolean;
}

interface PrismaAdapterResolvedOptions extends PrismaAdapterUserOptions {
  prisma: PrismaClientLike;
}

interface PrismaCreateArgs {
  data: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface PrismaFindArgs {
  where?: Record<string, unknown>;
  select?: Record<string, boolean>;
  take?: number;
  skip?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

interface PrismaCountArgs {
  where?: Record<string, unknown>;
}

interface PrismaUpdateArgs {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface PrismaUpdateManyArgs {
  where?: Record<string, unknown>;
  data: Record<string, unknown>;
}

interface PrismaUpsertArgs {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface PrismaDeleteArgs {
  where: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface PrismaDeleteManyArgs {
  where?: Record<string, unknown>;
}

interface PrismaBulkResult {
  count: number;
}

interface PrismaModelDelegate {
  create(args: PrismaCreateArgs): Promise<Record<string, unknown>>;
  findFirst(args: PrismaFindArgs): Promise<Record<string, unknown> | null>;
  findMany(args: PrismaFindArgs): Promise<Record<string, unknown>[]>;
  count(args: PrismaCountArgs): Promise<number>;
  update(args: PrismaUpdateArgs): Promise<Record<string, unknown>>;
  updateMany(args: PrismaUpdateManyArgs): Promise<PrismaBulkResult>;
  upsert(args: PrismaUpsertArgs): Promise<Record<string, unknown>>;
  delete(args: PrismaDeleteArgs): Promise<Record<string, unknown> | null>;
  deleteMany(args: PrismaDeleteManyArgs): Promise<PrismaBulkResult>;
}

export interface PrismaClientLike extends Record<string, unknown> {
  $transaction?: <TReturn>(
    run: (tx: PrismaClientLike) => Promise<TReturn> | TReturn,
  ) => Promise<TReturn>;
}

function getModelDelegate(
  client: PrismaClientLike,
  model: string,
): PrismaModelDelegate {
  // Prisma exposes models as fields on the client. Fail fast if the model is missing
  // so the caller can fix their schema or modelMap configuration.
  const delegate = client[model];
  if (!delegate) {
    throw new AgentStackError(
      "DB_ADAPTER_MODEL_NOT_FOUND",
      `Model "${model}" does not exist on the Prisma client. Ensure the client is generated and the model mapping is correct.`,
    );
  }
  return delegate as PrismaModelDelegate;
}

function operatorToPrismaKey(
  operator: AdapterWhereCondition["operator"],
): string | undefined {
  switch (operator) {
    case "ne":
      return "not";
    case "lt":
      return "lt";
    case "lte":
      return "lte";
    case "gt":
      return "gt";
    case "gte":
      return "gte";
    case "in":
      return "in";
    case "not_in":
      return "notIn";
    case "contains":
      return "contains";
    case "starts_with":
      return "startsWith";
    case "ends_with":
      return "endsWith";
    case "eq":
    case undefined:
      return undefined;
    default: {
      const exhaustiveCheck: never = operator;
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        `Unsupported operator "${String(exhaustiveCheck)}" supplied for Prisma adapter.`,
      );
    }
  }
}

function buildFieldCondition(
  condition: AdapterWhereCondition,
  fieldNormalizer: (field: string) => string,
): Record<string, unknown> {
  // Prisma uses nested objects for non-equality comparisons. We normalise the
  // adapter-level operator into Prisma's vocabulary.
  const fieldName = fieldNormalizer(condition.field);
  const operatorKey = operatorToPrismaKey(condition.operator);

  if (!operatorKey) {
    return {
      [fieldName]: condition.value,
    };
  }

  if (operatorKey === "in" || operatorKey === "notIn") {
    const values = ensureArrayValue(condition);
    return {
      [fieldName]: {
        [operatorKey]: values,
      },
    };
  }

  return {
    [fieldName]: {
      [operatorKey]: condition.value,
    },
  };
}

function buildPrismaWhere(
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): Record<string, unknown> {
  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1 && !conditions[0]?.connector) {
    return buildFieldCondition(conditions[0]!, fieldNormalizer);
  }

  const andClauses: Record<string, unknown>[] = [];
  const orClauses: Record<string, unknown>[] = [];

  conditions.forEach((condition) => {
    const clause = buildFieldCondition(condition, fieldNormalizer);
    if (condition.connector === "OR") {
      orClauses.push(clause);
    } else {
      andClauses.push(clause);
    }
  });

  const prismaWhere: Record<string, unknown> = {};
  if (andClauses.length === 1 && orClauses.length === 0) {
    return andClauses[0] ?? {};
  }
  if (andClauses.length > 0) {
    prismaWhere.AND = andClauses;
  }
  if (orClauses.length > 0) {
    prismaWhere.OR = orClauses;
  }
  return prismaWhere;
}

function isEqualityCondition(condition: AdapterWhereCondition): boolean {
  const operator = condition.operator ?? "eq";
  if (operator !== "eq") {
    return false;
  }
  return condition.connector !== "OR";
}

function buildPrismaUniqueWhere(
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): Record<string, unknown> {
  if (conditions.length === 0) {
    throw new AgentStackError(
      "DB_ADAPTER_UPSERT_WHERE_REQUIRED",
      "Upsert operations require a where clause with equality conditions.",
    );
  }

  if (!conditions.every(isEqualityCondition)) {
    throw new AgentStackError(
      "DB_ADAPTER_INVALID_WHERE",
      "Upsert where clauses may only include equality comparisons joined with AND.",
    );
  }

  return conditions.reduce<Record<string, unknown>>((acc, condition) => {
    const fieldName = fieldNormalizer(condition.field);
    acc[fieldName] = condition.value;
    return acc;
  }, {});
}

// Prisma expects boolean selects (field -> true). We reuse the normalization hook
// so adapters expose consistent field naming behaviour.
function convertSelect(
  select: string[] | undefined,
  model: string,
  normalizeFieldName: (model: string, field: string) => string,
) {
  if (!select?.length) {
    return undefined;
  }
  const mappedEntries = select.map(
    (field) => [normalizeFieldName(model, field), true] as const,
  );
  return Object.fromEntries(mappedEntries);
}

const basePrismaAdapter = createAdapterFactory<PrismaAdapterResolvedOptions>({
  hooks: {
    logger: createDebugLoggerHook<PrismaAdapterResolvedOptions>("prisma"),
    normalizeModelName: ({ options, model }) => {
      const mapped = options.modelMap?.[model];
      if (mapped) {
        return mapped;
      }
      if (options.usePlural) {
        return pluralizeModel(model);
      }
      return model;
    },
    normalizeFieldName: ({ options, model, field }) => {
      if (options.camelCase) {
        return camelToSnake(field);
      }
      const mapped = options.modelMap?.[`${model}.${field}`];
      return mapped ?? field;
    },
  },
  config: (options) => ({
    adapterId: "prisma",
    adapterName: "Prisma",
    usePlural: options.usePlural ?? false,
    supportsJSON:
      options.provider !== "mysql" && options.provider !== "sqlserver",
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: options.provider !== "mongodb",
  }),
  adapter: ({
    options,
    wrapOperation,
    normalizeModelName,
    normalizeFieldName,
  }) => {
    const { prisma } = options;

    const buildOperations = (
      client: PrismaClientLike,
    ): DatabaseAdapterMethods => ({
      create: wrapOperation<AdapterCreateArgs, unknown>(
        "create",
        async ({ model, data, select }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          return delegate.create({
            data,
            select: convertSelect(select, modelName, normalizeFieldName),
          });
        },
      ),
      findOne: wrapOperation<AdapterFindOneArgs, unknown | null>(
        "findOne",
        async ({ model, where, select }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          return delegate.findFirst({
            where: prismaWhere,
            select: convertSelect(select, modelName, normalizeFieldName),
          });
        },
      ),
      findMany: wrapOperation<AdapterFindManyArgs, unknown[]>(
        "findMany",
        async ({ model, where, sortBy, limit, offset }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          const [primarySort] = normalizeSortInput(sortBy);
          const orderBy: Record<string, "asc" | "desc"> | undefined =
            primarySort?.field !== undefined
              ? {
                  [normalizeFieldName(modelName, primarySort.field)]:
                    primarySort.direction === "desc" ? "desc" : "asc",
                }
              : undefined;
          return delegate.findMany({
            where: prismaWhere,
            orderBy,
            take: limit,
            skip: offset,
          });
        },
      ),
      count: wrapOperation<AdapterCountArgs, number>(
        "count",
        async ({ model, where }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          return delegate.count({
            where: prismaWhere,
          });
        },
      ),
      upsert: wrapOperation<AdapterUpsertArgs, unknown>(
        "upsert",
        async ({ model, where, create, update, select }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const uniqueWhere = buildPrismaUniqueWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          return delegate.upsert({
            where: uniqueWhere,
            create,
            update,
            select: convertSelect(select, modelName, normalizeFieldName),
          });
        },
      ),
      update: wrapOperation<AdapterUpdateArgs, unknown>(
        "update",
        async ({ model, where, update, select }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          return delegate.update({
            where: prismaWhere,
            data: update,
            select: convertSelect(select, modelName, normalizeFieldName),
          });
        },
      ),
      updateMany: wrapOperation<AdapterUpdateManyArgs, number>(
        "updateMany",
        async ({ model, where, update }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          const result = await delegate.updateMany({
            where: prismaWhere,
            data: update,
          });
          return result.count;
        },
      ),
      delete: wrapOperation<AdapterDeleteArgs, unknown>(
        "delete",
        async ({ model, where, select }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          try {
            return await delegate.delete({
              where: prismaWhere,
              select: convertSelect(select, modelName, normalizeFieldName),
            });
          } catch {
            return null;
          }
        },
      ),
      deleteMany: wrapOperation<AdapterDeleteArgs, number>(
        "deleteMany",
        async ({ model, where }) => {
          const modelName = normalizeModelName(model);
          const delegate = getModelDelegate(client, modelName);
          const normalizedWhere = normalizeWhereInput(where);
          const prismaWhere = buildPrismaWhere(normalizedWhere, (field) =>
            normalizeFieldName(modelName, field),
          );
          const result = await delegate.deleteMany({
            where: prismaWhere,
          });
          return result.count;
        },
      ),
      options,
    });

    const baseOperations = buildOperations(prisma);

    const transaction =
      options.transaction && typeof prisma.$transaction === "function"
        ? async <TReturn>(
            run: (
              adapter: DatabaseAdapterMethods,
            ) => Promise<TReturn> | TReturn,
          ) => {
            // Recreate the adapter on the transactional Prisma client so callers
            // get the same API surface while sharing the transaction scope.
            return prisma.$transaction!(async (tx) => {
              const nestedOperations = buildOperations(tx);
              return run(nestedOperations);
            });
          }
        : undefined;

    return transaction ? { ...baseOperations, transaction } : baseOperations;
  },
});

export function prismaAdapter(
  prisma: PrismaClientLike,
  options: PrismaAdapterUserOptions,
) {
  return basePrismaAdapter({
    ...options,
    prisma,
  });
}
