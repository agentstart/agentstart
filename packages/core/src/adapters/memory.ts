/* agent-frontmatter:start
AGENT: In-memory adapter
PURPOSE: Provide a lightweight adapter for testing and ephemeral storage
USAGE: memoryAdapter()
EXPORTS: memoryAdapter
FEATURES:
  - Pure JavaScript storage with filter/sort support
  - Shares normalization logic with database adapters
  - Ideal for unit tests or ephemeral agents
SEARCHABLE: memory adapter, in-memory storage, testing adapter
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
} from "./create-database-adapter";
import { createDebugLoggerHook } from "./debug";
import { camelToSnake, pluralizeModel } from "./naming";
import {
  type AdapterWhereCondition,
  ensureArrayValue,
  normalizeSortInput,
  normalizeWhereInput,
  splitWhereConditions,
} from "./where";

export interface MemoryAdapterOptions {
  usePlural?: boolean;
  camelCase?: boolean;
  debug?:
    | boolean
    | {
        logger?: AdapterDebugLogger;
      };
  generateId?: () => string;
}

interface MemoryAdapterResolvedOptions extends MemoryAdapterOptions {
  store: MemoryStore;
}

type MemoryRecord = Record<string, unknown>;

interface MemoryStore {
  collections: Map<string, MemoryRecord[]>;
}

function defaultGenerateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function cloneRecord<T extends MemoryRecord>(record: T): T {
  return structuredClone(record);
}

function getCollection(store: MemoryStore, name: string): MemoryRecord[] {
  const existing = store.collections.get(name);
  if (existing) {
    return existing;
  }
  const created: MemoryRecord[] = [];
  store.collections.set(name, created);
  return created;
}

function getNestedValue(record: MemoryRecord, path: string): unknown {
  if (!path.includes(".")) {
    return record[path];
  }
  return path.split(".").reduce<unknown>((value, segment) => {
    if (
      typeof value === "object" &&
      value !== null &&
      segment in (value as Record<string, unknown>)
    ) {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, record);
}

function evaluateCondition(
  record: MemoryRecord,
  condition: AdapterWhereCondition,
  fieldNormalizer: (field: string) => string,
): boolean {
  // All comparisons operate on normalized field names so consumers can opt into
  // camel-to-snake conversion the same way as SQL adapters.
  const normalizedField = fieldNormalizer(condition.field);
  const value = getNestedValue(record, normalizedField);
  const target = condition.value;

  switch (condition.operator) {
    case "ne":
      return value !== target;
    case "lt":
      return typeof value === "number" && typeof target === "number"
        ? value < target
        : false;
    case "lte":
      return typeof value === "number" && typeof target === "number"
        ? value <= target
        : false;
    case "gt":
      return typeof value === "number" && typeof target === "number"
        ? value > target
        : false;
    case "gte":
      return typeof value === "number" && typeof target === "number"
        ? value >= target
        : false;
    case "in": {
      const list = ensureArrayValue(condition);
      return list.some((entry) => entry === value);
    }
    case "not_in": {
      const list = ensureArrayValue(condition);
      return !list.some((entry) => entry === value);
    }
    case "contains":
      return typeof value === "string" && typeof target === "string"
        ? value.includes(target)
        : false;
    case "starts_with":
      return typeof value === "string" && typeof target === "string"
        ? value.startsWith(target)
        : false;
    case "ends_with":
      return typeof value === "string" && typeof target === "string"
        ? value.endsWith(target)
        : false;
    case undefined:
    case "eq":
      return value === target;
    default: {
      const exhaustive: never = condition.operator;
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        `Unsupported operator "${String(exhaustive)}" supplied for memory adapter.`,
      );
    }
  }
}

function evaluateWhere(
  record: MemoryRecord,
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): boolean {
  if (conditions.length === 0) {
    return true;
  }

  const { andConditions, orConditions } = splitWhereConditions(conditions);

  const andResult = andConditions.every((condition) =>
    evaluateCondition(record, condition, fieldNormalizer),
  );
  const orResult =
    orConditions.length === 0
      ? true
      : orConditions.some((condition) =>
          evaluateCondition(record, condition, fieldNormalizer),
        );

  // Memory adapter mirrors SQL-like semantics: AND group must pass, OR group is optional.
  return andResult && orResult;
}

function applyProjection(
  record: MemoryRecord,
  select: string[] | undefined,
): MemoryRecord {
  if (!select?.length) {
    return cloneRecord(record);
  }
  const projected: MemoryRecord = {};
  for (const field of select) {
    if (field in record) {
      projected[field] = cloneRecord(record[field] as MemoryRecord);
    }
  }
  return projected;
}

function sortRecords(
  records: MemoryRecord[],
  sort: AdapterFindManyArgs["sortBy"],
  fieldNormalizer: (field: string) => string,
): MemoryRecord[] {
  const normalizedSort = normalizeSortInput(sort);
  if (normalizedSort.length === 0) {
    return records;
  }
  const primarySort = normalizedSort[0]!;
  const sortKey = fieldNormalizer(primarySort.field);
  const direction = primarySort.direction === "desc" ? -1 : 1;
  const sorted = [...records];
  // Sorting is shallow – clone before mutating to keep the source array intact.
  sorted.sort((a, b) => {
    const aValue = getNestedValue(a, sortKey);
    const bValue = getNestedValue(b, sortKey);

    if (aValue === bValue) {
      return 0;
    }

    if (aValue === undefined || aValue === null) {
      return 1;
    }
    if (bValue === undefined || bValue === null) {
      return -1;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return aValue > bValue ? direction : -direction;
    }

    const aString = String(aValue);
    const bString = String(bValue);
    return aString > bString ? direction : -direction;
  });
  return sorted;
}

const baseMemoryAdapter = createAdapterFactory<MemoryAdapterResolvedOptions>({
  hooks: {
    logger: createDebugLoggerHook<MemoryAdapterResolvedOptions>("memory"),
    normalizeModelName: ({ options, model }) =>
      options.usePlural ? pluralizeModel(model) : model,
    normalizeFieldName: ({ options, field }) =>
      options.camelCase ? camelToSnake(field) : field,
  },
  config: (options) => ({
    adapterId: "memory",
    adapterName: "In-memory",
    usePlural: options.usePlural ?? false,
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: true,
  }),
  adapter: ({
    options,
    wrapOperation,
    normalizeModelName,
    normalizeFieldName,
  }) => {
    const { store } = options;
    const generateId = options.generateId ?? defaultGenerateId;

    const matchRecords = (
      records: MemoryRecord[],
      model: string,
      where: unknown,
    ) => {
      const normalizedWhere = normalizeWhereInput(where);
      return records.filter((record) =>
        evaluateWhere(record, normalizedWhere, (field) =>
          normalizeFieldName(model, field),
        ),
      );
    };

    return {
      create: wrapOperation<AdapterCreateArgs, unknown>(
        "create",
        async ({ model, data }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const record = cloneRecord(data);
          if (!("id" in record)) {
            record.id = generateId();
          }
          collection.push(record);
          return cloneRecord(record);
        },
      ),
      upsert: wrapOperation<AdapterUpsertArgs, unknown>(
        "upsert",
        async ({ model, where, create, update, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const normalizedWhere = normalizeWhereInput(where);
          const fieldNormalizer = (field: string) =>
            normalizeFieldName(collectionName, field);
          const index = collection.findIndex((record) =>
            evaluateWhere(record, normalizedWhere, fieldNormalizer),
          );
          if (index >= 0) {
            const target = collection[index]!;
            Object.assign(target, update);
            return applyProjection(target, select);
          }
          const merged = { ...create, ...update };
          if (!("id" in merged)) {
            merged.id = generateId();
          }
          const record = cloneRecord(merged);
          collection.push(record);
          return applyProjection(record, select);
        },
      ),
      findOne: wrapOperation<AdapterFindOneArgs, unknown | null>(
        "findOne",
        async ({ model, where, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const matches = matchRecords(collection, collectionName, where);
          const first = matches[0];
          if (!first) {
            return null;
          }
          return applyProjection(first, select);
        },
      ),
      findMany: wrapOperation<AdapterFindManyArgs, unknown[]>(
        "findMany",
        async ({ model, where, sortBy, limit, offset, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          let matches = matchRecords(collection, collectionName, where);
          matches = sortRecords(matches, sortBy, (field) =>
            normalizeFieldName(collectionName, field),
          );
          if (typeof offset === "number") {
            matches = matches.slice(offset);
          }
          if (typeof limit === "number") {
            matches = matches.slice(0, limit);
          }
          return matches.map((record) => applyProjection(record, select));
        },
      ),
      count: wrapOperation<AdapterCountArgs, number>(
        "count",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const matches = matchRecords(collection, collectionName, where);
          return matches.length;
        },
      ),
      update: wrapOperation<AdapterUpdateArgs, unknown>(
        "update",
        async ({ model, where, update }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const normalizedWhere = normalizeWhereInput(where);
          const fieldNormalizer = (field: string) =>
            normalizeFieldName(collectionName, field);
          const target = collection.find((record) =>
            evaluateWhere(record, normalizedWhere, fieldNormalizer),
          );
          if (target === undefined) {
            return null;
          }
          Object.assign(target, update);
          return cloneRecord(target);
        },
      ),
      updateMany: wrapOperation<AdapterUpdateManyArgs, number>(
        "updateMany",
        async ({ model, where, update }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const normalizedWhere = normalizeWhereInput(where);
          const fieldNormalizer = (field: string) =>
            normalizeFieldName(collectionName, field);
          let count = 0;
          collection.forEach((record) => {
            if (evaluateWhere(record, normalizedWhere, fieldNormalizer)) {
              Object.assign(record, update);
              count += 1;
            }
          });
          return count;
        },
      ),
      delete: wrapOperation<AdapterDeleteArgs, unknown>(
        "delete",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const normalizedWhere = normalizeWhereInput(where);
          const fieldNormalizer = (field: string) =>
            normalizeFieldName(collectionName, field);
          const index = collection.findIndex((record) =>
            evaluateWhere(record, normalizedWhere, fieldNormalizer),
          );
          if (index === -1) {
            return null;
          }
          const [removed] = collection.splice(index, 1);
          if (removed === undefined) {
            return null;
          }
          return cloneRecord(removed);
        },
      ),
      deleteMany: wrapOperation<AdapterDeleteArgs, number>(
        "deleteMany",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = getCollection(store, collectionName);
          const normalizedWhere = normalizeWhereInput(where);
          const fieldNormalizer = (field: string) =>
            normalizeFieldName(collectionName, field);
          const initialLength = collection.length;
          const retained = collection.filter(
            (record) =>
              !evaluateWhere(record, normalizedWhere, fieldNormalizer),
          );
          store.collections.set(collectionName, retained);
          return initialLength - retained.length;
        },
      ),
      options,
    };
  },
});

export function memoryAdapter(options: MemoryAdapterOptions = {}) {
  const store: MemoryStore = {
    collections: new Map<string, MemoryRecord[]>(),
  };
  // Every call to memoryAdapter gets an isolated store, making it safe to use in
  // parallel tests without leaking state.
  return baseMemoryAdapter({
    ...options,
    store,
  });
}
