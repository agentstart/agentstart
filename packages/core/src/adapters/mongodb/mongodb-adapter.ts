/* agent-frontmatter:start
AGENT: MongoDB adapter
PURPOSE: Provide a database adapter implementation backed by MongoDB
USAGE: mongodbAdapter(db, { provider: "mongodb" })
EXPORTS: mongodbAdapter
FEATURES:
  - Translates normalized filters into MongoDB query documents
  - Supports projections, sorting, and pagination
  - Returns updated documents where supported
SEARCHABLE: mongodb adapter, database adapter, document integration
agent-frontmatter:end */

import { AgentStackError } from "@agent-stack/errors";
import type {
  Db,
  Document,
  Filter,
  FindOneAndDeleteOptions,
  FindOneAndUpdateOptions,
  FindOptions,
  InsertOneResult,
  DeleteResult as MongoDeleteResult,
  UpdateResult as MongoUpdateResult,
  UpdateFilter,
} from "mongodb";

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
} from "../create-database-adapter";
import {
  type AdapterWhereCondition,
  applyInputTransforms,
  camelToSnake,
  createDebugLoggerHook,
  ensureArrayValue,
  mapSelectToObject,
  normalizeSortInput,
  normalizeWhereInput,
  pluralizeModel,
  splitWhereConditions,
} from "../shared";

export interface MongoAdapterUserOptions {
  usePlural?: boolean;
  camelCase?: boolean;
  collectionMap?: Record<string, string>;
  debug?:
    | boolean
    | {
        logger?: AdapterDebugLogger;
      };
}

interface MongoAdapterResolvedOptions extends MongoAdapterUserOptions {
  db: Db;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildFieldCondition(
  condition: AdapterWhereCondition,
  fieldNormalizer: (field: string) => string,
): Filter<Document> {
  // MongoDB relies on operator-prefixed objects; perform the mapping here so
  // adapters share the same where representation.
  const fieldName = fieldNormalizer(condition.field);
  switch (condition.operator) {
    case "ne":
      return { [fieldName]: { $ne: condition.value } };
    case "lt":
      return { [fieldName]: { $lt: condition.value } };
    case "lte":
      return { [fieldName]: { $lte: condition.value } };
    case "gt":
      return { [fieldName]: { $gt: condition.value } };
    case "gte":
      return { [fieldName]: { $gte: condition.value } };
    case "in": {
      const values = ensureArrayValue(condition);
      return { [fieldName]: { $in: values } };
    }
    case "not_in": {
      const values = ensureArrayValue(condition);
      return { [fieldName]: { $nin: values } };
    }
    case "contains": {
      const pattern = `.*${escapeRegExp(String(condition.value))}.*`;
      return { [fieldName]: { $regex: new RegExp(pattern) } };
    }
    case "starts_with": {
      const pattern = `^${escapeRegExp(String(condition.value))}`;
      return { [fieldName]: { $regex: new RegExp(pattern) } };
    }
    case "ends_with": {
      const pattern = `${escapeRegExp(String(condition.value))}$`;
      return { [fieldName]: { $regex: new RegExp(pattern) } };
    }
    case undefined:
    case "eq":
      return { [fieldName]: condition.value };
    default: {
      const exhaustive: never = condition.operator;
      throw new AgentStackError(
        "DB_ADAPTER_INVALID_WHERE",
        `Unsupported operator "${String(exhaustive)}" supplied for MongoDB adapter.`,
      );
    }
  }
}

function buildMongoFilter(
  conditions: AdapterWhereCondition[],
  fieldNormalizer: (field: string) => string,
): Filter<Document> {
  if (conditions.length === 0) {
    return {};
  }

  const { andConditions, orConditions } = splitWhereConditions(conditions);

  if (andConditions.length === 1 && orConditions.length === 0) {
    return buildFieldCondition(andConditions[0]!, fieldNormalizer);
  }

  const filter: Filter<Document> = {};
  if (andConditions.length > 0) {
    filter.$and = andConditions.map((condition) =>
      buildFieldCondition(condition, fieldNormalizer),
    );
  }
  if (orConditions.length > 0) {
    filter.$or = orConditions.map((condition) =>
      buildFieldCondition(condition, fieldNormalizer),
    );
  }
  return filter;
}

function convertProjection(
  model: string,
  select: string[] | undefined,
  normalizeFieldName: (model: string, field: string) => string,
): FindOptions<Document>["projection"] {
  // Mongo projections expect a document of `{ field: 1 }` pairs.
  return mapSelectToObject(select, model, normalizeFieldName, () => 1);
}

function buildSortDocument(
  model: string,
  sort: AdapterFindManyArgs["sortBy"],
  normalizeFieldName: (model: string, field: string) => string,
): Document | undefined {
  const [primarySort] = normalizeSortInput(sort);
  if (!primarySort?.field) {
    return undefined;
  }
  return {
    [normalizeFieldName(model, primarySort.field)]:
      primarySort.direction === "desc" ? -1 : 1,
  };
}

const baseMongoAdapter = createAdapterFactory<MongoAdapterResolvedOptions>({
  hooks: {
    logger: createDebugLoggerHook<MongoAdapterResolvedOptions>("mongodb"),
    normalizeModelName: ({ options, model }) => {
      const mapped = options.collectionMap?.[model];
      if (mapped) {
        return mapped;
      }
      return options.usePlural ? pluralizeModel(model) : model;
    },
    normalizeFieldName: ({ options, field }) =>
      options.camelCase ? camelToSnake(field) : field,
  },
  config: (options) => ({
    adapterId: "mongodb",
    adapterName: "MongoDB",
    usePlural: options.usePlural ?? false,
    supportsJSON: true,
    supportsDates: true,
    supportsBooleans: true,
    supportsNumericIds: false,
  }),
  adapter: ({
    options,
    wrapOperation,
    normalizeModelName,
    normalizeFieldName,
    getFieldAttributes,
  }) => {
    const { db } = options;

    const buildFilter = (model: string, where: unknown): Filter<Document> =>
      buildMongoFilter(normalizeWhereInput(where), (field) =>
        normalizeFieldName(model, field),
      );

    return {
      create: wrapOperation<AdapterCreateArgs, unknown>(
        "create",
        async ({ model, data, allowId }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const prepared = applyInputTransforms({
            action: "create",
            model,
            data,
            allowId,
            getFieldAttributes,
          }) as Document;
          const result: InsertOneResult<Document> =
            await collection.insertOne(prepared);
          const insertedId = result.insertedId;
          if (!insertedId) {
            return prepared;
          }
          const inserted = await collection.findOne({ _id: insertedId });
          return inserted ?? { ...prepared, _id: insertedId };
        },
      ),
      upsert: wrapOperation<AdapterUpsertArgs, unknown>(
        "upsert",
        async ({ model, where, create, update, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const preparedCreate = applyInputTransforms({
            action: "create",
            model,
            data: create,
            getFieldAttributes,
          }) as Document;
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Document;
          const updateDoc: UpdateFilter<Document> = {
            $set: preparedUpdate,
            ...(Object.keys(preparedCreate).length > 0
              ? { $setOnInsert: preparedCreate }
              : {}),
          };
          const projection = convertProjection(
            collectionName,
            select,
            normalizeFieldName,
          );
          const options: FindOneAndUpdateOptions = {
            upsert: true,
            returnDocument: "after",
            projection,
          };
          const result = await collection.findOneAndUpdate(
            filter,
            updateDoc,
            options,
          );
          if (result?.value) {
            return result.value;
          }
          return collection.findOne(filter, { projection });
        },
      ),
      findOne: wrapOperation<AdapterFindOneArgs, unknown | null>(
        "findOne",
        async ({ model, where, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const projection = convertProjection(
            collectionName,
            select,
            normalizeFieldName,
          );
          return collection.findOne(filter, { projection });
        },
      ),
      findMany: wrapOperation<AdapterFindManyArgs, unknown[]>(
        "findMany",
        async ({ model, where, sortBy, limit, offset, select }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const projection = convertProjection(
            collectionName,
            select,
            normalizeFieldName,
          );
          const cursor = projection
            ? collection.find(filter, { projection })
            : collection.find(filter);
          const sortDocument = buildSortDocument(
            collectionName,
            sortBy,
            normalizeFieldName,
          );
          if (sortDocument) {
            cursor.sort(sortDocument);
          }
          if (typeof offset === "number") {
            cursor.skip(offset);
          }
          if (typeof limit === "number") {
            cursor.limit(limit);
          }
          return cursor.toArray();
        },
      ),
      count: wrapOperation<AdapterCountArgs, number>(
        "count",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          return collection.countDocuments(filter);
        },
      ),
      update: wrapOperation<AdapterUpdateArgs, unknown>(
        "update",
        async ({ model, where, update }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Document;
          const updateDoc: UpdateFilter<Document> = {
            $set: preparedUpdate,
          };
          const options: FindOneAndUpdateOptions = {
            returnDocument: "after",
          };
          const result = await collection.findOneAndUpdate(
            filter,
            updateDoc,
            options,
          );
          if (!result) {
            return null;
          }
          return result.value ?? null;
        },
      ),
      updateMany: wrapOperation<AdapterUpdateManyArgs, number>(
        "updateMany",
        async ({ model, where, update }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const preparedUpdate = applyInputTransforms({
            action: "update",
            model,
            data: update,
            getFieldAttributes,
          }) as Document;
          const updateDoc: UpdateFilter<Document> = {
            $set: preparedUpdate,
          };
          const result: MongoUpdateResult = await collection.updateMany(
            filter,
            updateDoc,
          );
          return result.modifiedCount ?? 0;
        },
      ),
      delete: wrapOperation<AdapterDeleteArgs, unknown>(
        "delete",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const options: FindOneAndDeleteOptions = {};
          const result = await collection.findOneAndDelete(filter, options);
          if (!result) {
            return null;
          }
          return result.value ?? null;
        },
      ),
      deleteMany: wrapOperation<AdapterDeleteArgs, number>(
        "deleteMany",
        async ({ model, where }) => {
          const collectionName = normalizeModelName(model);
          const collection = db.collection(collectionName);
          const filter = buildFilter(collectionName, where);
          const result: MongoDeleteResult = await collection.deleteMany(filter);
          return result.deletedCount ?? 0;
        },
      ),
      options,
    };
  },
});

export function mongodbAdapter(db: Db, options: MongoAdapterUserOptions = {}) {
  return baseMongoAdapter({
    ...options,
    db,
  });
}
