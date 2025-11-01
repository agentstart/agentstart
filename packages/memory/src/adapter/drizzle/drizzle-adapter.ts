/* agent-frontmatter:start
AGENT: Agent persistence adapter
PURPOSE: Implements Drizzle ORM persistence for AgentStart memory stores.
USAGE: Instantiate with a Drizzle database instance when persisting agent data.
EXPORTS: DB, DrizzleAdapterConfig, drizzleAdapter
FEATURES:
  - Translates AgentStart filters into Drizzle query builders
  - Normalizes date handling across Postgres and SQLite providers
SEARCHABLE: packages, agentstart, src, memory, adapter, drizzle, persistence
agent-frontmatter:end */

/**
 * Drizzle ORM exposes database tables through dynamic helpers that vary by provider
 * and schema configuration. The structure is determined at runtime based on your
 * drizzle configuration and cannot be statically typed without complex conditional types.
 *
 * This is a justified use of `any` because:
 * - Drizzle's type system relies on schema inference at the usage site
 * - The DB interface provides a consistent access pattern across different providers
 * - Type safety is maintained through our adapter layer's schema validation
 */

import type {
  AgentStartOptions,
  FieldAttribute,
  MemoryAdapter,
  Where,
} from "@agentstart/types";
import { AgentStartError, generateId } from "@agentstart/utils";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  lt,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { getTables } from "../../get-tables";
import { createGetFieldFunction, validateTable } from "../shared";
import { withApplyDefault } from "../utils";

export interface DB {
  [key: string]: any;
}

const createTransform = (
  db: DB,
  config: DrizzleAdapterConfig,
  options: Omit<AgentStartOptions, "agent">,
) => {
  const schema = getTables(options);
  const isSqliteProvider = config.provider === "sqlite";
  const getField = createGetFieldFunction(schema, "drizzle");

  const getFieldAttribute = (model: string, field: string) => {
    if (field === "id") {
      return undefined;
    }
    const table = validateTable(schema, model, "drizzle");
    return table.fields[field];
  };

  const getModelName = (model: string) => {
    const table = validateTable(schema, model, "drizzle");
    return table.modelName !== model
      ? table.modelName
      : config.usePlural
        ? `${model}s`
        : model;
  };

  const normalizeDateForWrite = (
    value: unknown,
    fieldAttr: FieldAttribute | undefined,
  ) => {
    if (
      !fieldAttr ||
      fieldAttr.type !== "date" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (value instanceof Date) {
      return isSqliteProvider ? value.toISOString() : value;
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return isSqliteProvider ? parsed.toISOString() : parsed;
      }
    }
    return value;
  };

  const normalizeJsonForWrite = (
    value: unknown,
    fieldAttr: FieldAttribute | undefined,
  ) => {
    if (
      !fieldAttr ||
      fieldAttr.type !== "json" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (isSqliteProvider && typeof value !== "string") {
      try {
        return JSON.stringify(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const normalizeDateForQuery = (
    value: unknown,
    model: string,
    field: string,
  ) => {
    const fieldAttr = getFieldAttribute(model, field);
    if (
      !fieldAttr ||
      fieldAttr.type !== "date" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (value instanceof Date) {
      return isSqliteProvider ? value.toISOString() : value;
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return isSqliteProvider ? parsed.toISOString() : parsed;
      }
    }
    return value;
  };

  const normalizeJsonForQuery = (
    value: unknown,
    model: string,
    field: string,
  ) => {
    const fieldAttr = getFieldAttribute(model, field);
    if (
      !fieldAttr ||
      fieldAttr.type !== "json" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (isSqliteProvider && typeof value !== "string") {
      try {
        return JSON.stringify(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  const normalizeDateForOutput = (
    value: unknown,
    fieldAttr: FieldAttribute | undefined,
  ) => {
    if (
      !fieldAttr ||
      fieldAttr.type !== "date" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  };

  const normalizeJsonForOutput = (
    value: unknown,
    fieldAttr: FieldAttribute | undefined,
  ) => {
    if (
      !fieldAttr ||
      fieldAttr.type !== "json" ||
      value === undefined ||
      value === null
    ) {
      return value;
    }
    if (isSqliteProvider && typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  };

  function getSchema(modelName: string) {
    const schema = config.schema || db._.fullSchema;
    if (!schema) {
      throw new AgentStartError(
        "DRIZZLE_SCHEMA_MISSING",
        "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.",
      );
    }
    const model = getModelName(modelName);
    const schemaModel = schema[model];
    if (!schemaModel) {
      throw new AgentStartError(
        "DRIZZLE_MODEL_MISSING",
        `[# Drizzle Adapter]: The model "${model}" was not found in the schema object. Please pass the schema directly to the adapter options.`,
      );
    }
    return schemaModel;
  }

  function convertWhereClause(where: Where[], model: string) {
    const schemaModel = getSchema(model);
    if (!where) return [];
    if (where.length === 1) {
      const w = where[0];
      if (!w) {
        return [];
      }
      const field = getField(model, w.field);
      if (!schemaModel[field]) {
        throw new AgentStartError(
          "DRIZZLE_FIELD_MISSING",
          `The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`,
        );
      }
      if (w.operator === "in") {
        if (!Array.isArray(w.value)) {
          throw new AgentStartError(
            "DRIZZLE_INVALID_OPERATOR",
            `The value for the field "${w.field}" must be an array when using the "in" operator.`,
          );
        }
        const normalizedValues = w.value.map((entry: unknown) => {
          const withDates = normalizeDateForQuery(entry, model, w.field);
          return normalizeJsonForQuery(withDates, model, w.field);
        });
        return [inArray(schemaModel[field], normalizedValues)];
      }

      if (w.operator === "contains") {
        return [like(schemaModel[field], `%${w.value}%`)];
      }

      if (w.operator === "starts_with") {
        return [like(schemaModel[field], `${w.value}%`)];
      }

      if (w.operator === "ends_with") {
        return [like(schemaModel[field], `%${w.value}`)];
      }

      if (w.operator === "lt") {
        const withDates = normalizeDateForQuery(w.value, model, w.field);
        const normalizedValue = normalizeJsonForQuery(
          withDates,
          model,
          w.field,
        );
        return [lt(schemaModel[field], normalizedValue)];
      }

      if (w.operator === "lte") {
        const withDates = normalizeDateForQuery(w.value, model, w.field);
        const normalizedValue = normalizeJsonForQuery(
          withDates,
          model,
          w.field,
        );
        return [lte(schemaModel[field], normalizedValue)];
      }

      const withDates = normalizeDateForQuery(w.value, model, w.field);
      const normalizedValue = normalizeJsonForQuery(withDates, model, w.field);
      return [eq(schemaModel[field], normalizedValue)];
    }
    const andGroup = where.filter((w) => w.connector === "AND" || !w.connector);
    const orGroup = where.filter((w) => w.connector === "OR");

    const andClause = and(
      ...andGroup.map((w) => {
        const field = getField(model, w.field);
        if (w.operator === "in") {
          if (!Array.isArray(w.value)) {
            throw new AgentStartError(
              "DRIZZLE_INVALID_OPERATOR",
              `The value for the field "${w.field}" must be an array when using the "in" operator.`,
            );
          }
          const normalizedValues = w.value.map((entry: unknown) => {
            const withDates = normalizeDateForQuery(entry, model, w.field);
            return normalizeJsonForQuery(withDates, model, w.field);
          });
          return inArray(schemaModel[field], normalizedValues);
        }
        const withDates = normalizeDateForQuery(w.value, model, w.field);
        const normalizedValue = normalizeJsonForQuery(
          withDates,
          model,
          w.field,
        );
        return eq(schemaModel[field], normalizedValue);
      }),
    );
    const orClause = or(
      ...orGroup.map((w) => {
        const field = getField(model, w.field);
        const withDates = normalizeDateForQuery(w.value, model, w.field);
        const normalizedValue = normalizeJsonForQuery(
          withDates,
          model,
          w.field,
        );
        return eq(schemaModel[field], normalizedValue);
      }),
    );

    const clause: SQL<unknown>[] = [];

    if (andGroup.length) clause.push(andClause!);
    if (orGroup.length) clause.push(orClause!);
    return clause;
  }

  const useDatabaseGeneratedId = options?.advanced?.generateId === false;
  return {
    getSchema,
    transformInput(
      data: Record<string, unknown>,
      model: string,
      action: "create" | "update",
    ): Record<string, unknown> {
      const transformedData: Record<string, unknown> =
        useDatabaseGeneratedId || action === "update"
          ? {}
          : {
              id: options.advanced?.generateId
                ? options.advanced.generateId({
                    model,
                  })
                : (data.id as string | undefined) || generateId(),
            };
      const table = schema[model];
      if (!table) {
        throw new AgentStartError(
          "DRIZZLE_TABLE_MISSING",
          `Table ${model} not found in schema`,
        );
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
        if (value === undefined && !fieldAttr.defaultValue) {
          continue;
        }
        const appliedDefault = withApplyDefault(value, fieldAttr, action);
        const withDates = normalizeDateForWrite(appliedDefault, fieldAttr);
        const normalizedValue = normalizeJsonForWrite(withDates, fieldAttr);
        transformedData[fieldAttr.fieldName || field] = normalizedValue;
      }
      return transformedData;
    },
    transformOutput(
      data: Record<string, unknown>,
      model: string,
      select: string[] = [],
    ): Record<string, unknown> | null {
      if (!data) return null;
      const base = data as Record<string, unknown>;
      const identifier =
        (base.id as string | undefined) ?? (base._id as string | undefined);
      const transformedData: Record<string, unknown> = identifier
        ? select.length === 0 || select.includes("id")
          ? {
              id: identifier,
            }
          : {}
        : {};
      const table = schema[model];
      if (!table) {
        throw new AgentStartError(
          "DRIZZLE_TABLE_MISSING",
          `Table ${model} not found in schema`,
        );
      }
      const tableSchema = table.fields;
      for (const key in tableSchema) {
        if (select.length && !select.includes(key)) {
          continue;
        }
        const field = tableSchema[key];
        if (field) {
          const rawValue = base[field.fieldName || key];
          const withDates = normalizeDateForOutput(rawValue, field);
          transformedData[key] = normalizeJsonForOutput(withDates, field);
        }
      }
      return transformedData;
    },
    convertWhereClause,
    withReturning: async (
      model: string,
      builder: unknown,
      data: Record<string, unknown>,
      where?: Where[],
    ) => {
      const queryBuilder = builder as {
        returning?: () => Promise<Record<string, unknown>[]>;
        execute: () => Promise<unknown>;
        config?: { values?: Array<Record<string, { value: unknown }>> };
      };
      if (config.provider !== "mysql") {
        const c = await queryBuilder.returning?.();
        return c ? c[0] : undefined;
      }
      await queryBuilder.execute();
      const schemaModel = getSchema(model);
      const builderValues = queryBuilder.config?.values;
      if (where?.length) {
        const clause = convertWhereClause(where, model);
        const res = await db
          .select()
          .from(schemaModel)
          .where(...clause);
        return res[0];
      }
      if (builderValues?.length) {
        const candidateIdEntry = builderValues[0]?.id;
        const candidateId =
          candidateIdEntry && typeof candidateIdEntry === "object"
            ? (candidateIdEntry as { value?: unknown }).value
            : undefined;
        if (candidateId === undefined || candidateId === null) {
          return undefined;
        }
        const res = await db
          .select()
          .from(schemaModel)
          .where(eq(schemaModel.id, candidateId as string));
        return res[0];
      }
      const providedId = data.id;
      if (!providedId) {
        return undefined;
      }
      const res = await db
        .select()
        .from(schemaModel)
        .where(eq(schemaModel.id, providedId as string));
      return res[0];
    },
    getField,
    getModelName,
  };
};

export interface DrizzleAdapterConfig {
  /**
   * The schema object that defines the tables and fields
   */
  schema?: Record<string, any>;
  /**
   * The database provider
   */
  provider: "postgresql" | "mysql" | "sqlite";
  /**
   * If the table names in the schema are plural
   * set this to true. For example, if the schema
   * has an object with a key "users" instead of "user"
   */
  usePlural?: boolean;
}

function checkMissingFields(
  schema: Record<string, any>,
  model: string,
  values: Record<string, unknown>,
) {
  if (!schema) {
    throw new AgentStartError(
      "DRIZZLE_SCHEMA_MISSING",
      "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.",
    );
  }
  for (const key in values) {
    if (!schema[key]) {
      throw new AgentStartError(
        "DRIZZLE_FIELD_MISSING",
        `The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using "npx agentstart/cli generate".`,
      );
    }
  }
}

export const drizzleAdapter =
  (db: DB, config: DrizzleAdapterConfig) =>
  (options: Omit<AgentStartOptions, "agent">) => {
    const {
      transformInput,
      transformOutput,
      convertWhereClause,
      getSchema,
      withReturning,
      getField,
      getModelName,
    } = createTransform(db, config, options);
    return {
      id: "drizzle",
      async create<T extends Record<string, unknown>, R = T>({
        model,
        data: values,
        select,
      }: {
        model: string;
        data: T;
        select?: string[];
      }): Promise<R> {
        const transformed = transformInput(values, model, "create");
        const schemaModel = getSchema(model);
        checkMissingFields(schemaModel, getModelName(model), transformed);
        const builder = db.insert(schemaModel).values(transformed);
        const returned = await withReturning(model, builder, transformed);
        const output = transformOutput(
          (returned ?? transformed) as Record<string, unknown>,
          model,
          select,
        );
        if (!output) {
          throw new AgentStartError(
            "DRIZZLE_CREATE_FAILED",
            `Unable to create record for model "${model}"`,
          );
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
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const res = (await db
          .select()
          .from(schemaModel)
          .where(...clause)) as Array<Record<string, unknown>>;
        const [first] = res;
        if (!first) return null;
        const output = transformOutput(first, model, select);
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
        const schemaModel = getSchema(model);
        const clause = where?.length ? convertWhereClause(where, model) : [];
        const sortFn = sortBy?.direction === "desc" ? desc : asc;
        const builder = db
          .select()
          .from(schemaModel)
          .limit(limit ?? 100)
          .offset(offset ?? 0);
        if (sortBy?.field) {
          builder.orderBy(sortFn(schemaModel[getField(model, sortBy.field)]));
        }
        const rows = (await builder.where(...clause)) as Array<
          Record<string, unknown>
        >;
        const outputs = rows
          .map((row) => transformOutput(row, model))
          .filter((row): row is Record<string, unknown> => row !== null);
        return outputs as T[];
      },
      async count({
        model,
        where,
      }: {
        model: string;
        where?: Where[];
      }): Promise<number> {
        const schemaModel = getSchema(model);
        const clause = where?.length ? convertWhereClause(where, model) : [];
        const result = (await db
          .select({ count: count() })
          .from(schemaModel)
          .where(...clause)) as Array<{ count: number }>;
        const first = result[0];
        return first ? Number(first.count) : 0;
      },
      async update<T>({
        model,
        where,
        update: values,
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<T | null> {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const transformed = transformInput(values, model, "update");
        const builder = db
          .update(schemaModel)
          .set(transformed)
          .where(...clause);
        const returned = await withReturning(
          model,
          builder,
          transformed,
          where,
        );
        if (!returned) {
          return null;
        }
        const output = transformOutput(returned, model);
        return output ? (output as T) : null;
      },
      async updateMany({
        model,
        where,
        update: values,
      }: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<number> {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const transformed = transformInput(values, model, "update");
        const builder = db
          .update(schemaModel)
          .set(transformed)
          .where(...clause);
        const result = await builder;
        if (!result) {
          return 0;
        }
        if (typeof result === "number") {
          return result;
        }
        if (Array.isArray(result)) {
          return result.length;
        }
        const maybe = result as {
          changes?: number;
          rowsAffected?: number;
          length?: number;
        };
        if (typeof maybe.changes === "number") return maybe.changes;
        if (typeof maybe.rowsAffected === "number") return maybe.rowsAffected;
        if (
          typeof (maybe as { affectedRows?: number }).affectedRows === "number"
        ) {
          return (maybe as { affectedRows: number }).affectedRows;
        }
        if (typeof (maybe as { rowCount?: number }).rowCount === "number") {
          return (maybe as { rowCount: number }).rowCount;
        }
        if (
          typeof (maybe as { numChangedRows?: number }).numChangedRows ===
          "number"
        ) {
          return Number(
            (maybe as { numChangedRows: bigint | number }).numChangedRows,
          );
        }
        if (typeof maybe.length === "number") return maybe.length;
        return 0;
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
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const transformedUpdate = transformInput(update, model, "update");
        const firstWhere = where[0];
        const isSingleEquality =
          where.length === 1 &&
          firstWhere &&
          (!firstWhere.operator ||
            firstWhere.operator.toLowerCase() === "eq") &&
          (!firstWhere.connector || firstWhere.connector === "AND");
        const conflictColumnKey = isSingleEquality
          ? getField(model, firstWhere.field)
          : undefined;
        const conflictColumn =
          conflictColumnKey &&
          (schemaModel as Record<string, unknown>)[conflictColumnKey];
        const canUseNativeUpsert =
          Boolean(conflictColumn) && Object.keys(transformedUpdate).length > 0;

        if (canUseNativeUpsert) {
          const mergedCreate = { ...create, ...update };
          const transformedCreate = transformInput(
            mergedCreate,
            model,
            "create",
          );
          checkMissingFields(
            schemaModel,
            getModelName(model),
            transformedCreate,
          );

          if (config.provider === "mysql") {
            const upsertBuilder = db
              .insert(schemaModel)
              .values(transformedCreate)
              .onDuplicateKeyUpdate({
                set: transformedUpdate,
              });
            const upserted = await withReturning(
              model,
              upsertBuilder,
              { ...transformedCreate, ...transformedUpdate },
              where,
            );
            const output = transformOutput(
              (upserted ?? transformedCreate) as Record<string, unknown>,
              model,
            );
            return output ? (output as T) : null;
          }

          const upsertBuilder = db
            .insert(schemaModel)
            .values(transformedCreate)
            .onConflictDoUpdate({
              target: (schemaModel as Record<string, unknown>)[
                conflictColumnKey!
              ],
              set: transformedUpdate,
            });
          const upserted = await withReturning(
            model,
            upsertBuilder,
            transformedCreate,
          );
          const output = transformOutput(
            (upserted ?? transformedCreate) as Record<string, unknown>,
            model,
          );
          return output ? (output as T) : null;
        }

        if (clause.length) {
          const updateBuilder = db
            .update(schemaModel)
            .set(transformedUpdate)
            .where(...clause);
          const updated = await withReturning(
            model,
            updateBuilder,
            transformedUpdate,
            where,
          );
          if (updated) {
            const output = transformOutput(updated, model);
            return output ? (output as T) : null;
          }
        }

        const mergedCreate = { ...create, ...update };
        const transformedCreate = transformInput(mergedCreate, model, "create");
        checkMissingFields(schemaModel, getModelName(model), transformedCreate);
        const insertBuilder = db.insert(schemaModel).values(transformedCreate);
        const created = await withReturning(
          model,
          insertBuilder,
          transformedCreate,
        );
        const output = transformOutput(
          (created ?? transformedCreate) as Record<string, unknown>,
          model,
        );
        return output ? (output as T) : null;
      },
      async delete({
        model,
        where,
      }: {
        model: string;
        where: Where[];
      }): Promise<void> {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        await db.delete(schemaModel).where(...clause);
      },
      async deleteMany({
        model,
        where,
      }: {
        model: string;
        where: Where[];
      }): Promise<number> {
        const schemaModel = getSchema(model);
        const clause = convertWhereClause(where, model);
        const result = await db.delete(schemaModel).where(...clause);
        if (!result) {
          return 0;
        }
        if (typeof result === "number") {
          return result;
        }
        if (Array.isArray(result)) {
          return result.length;
        }
        const maybe = result as {
          changes?: number;
          rowsAffected?: number;
          length?: number;
        };
        if (typeof maybe.changes === "number") return maybe.changes;
        if (typeof maybe.rowsAffected === "number") return maybe.rowsAffected;
        if (
          typeof (maybe as { affectedRows?: number }).affectedRows === "number"
        ) {
          return (maybe as { affectedRows: number }).affectedRows;
        }
        if (typeof (maybe as { rowCount?: number }).rowCount === "number") {
          return (maybe as { rowCount: number }).rowCount;
        }
        if (
          typeof (maybe as { numChangedRows?: number }).numChangedRows ===
          "number"
        ) {
          return Number(
            (maybe as { numChangedRows: bigint | number }).numChangedRows,
          );
        }
        if (typeof maybe.length === "number") return maybe.length;
        return 0;
      },
      options: config,
    } satisfies MemoryAdapter;
  };
