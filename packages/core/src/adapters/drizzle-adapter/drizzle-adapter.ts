import { AgentStackError } from "@agent-stack/errors";
import { generateId } from "@agent-stack/utils";
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
import { getAuthTables } from "../../db";
import type { Adapter, AgentStackOptions, Where } from "../../types";
import { withApplyDefault } from "../utils";

export interface DB {
  // biome-ignore lint/suspicious/noExplicitAny: Drizzle database exposes dynamic helpers without stable TypeScript types.
  [key: string]: any;
}

const createTransform = (
  db: DB,
  config: DrizzleAdapterConfig,
  options: Omit<AgentStackOptions, "agents">,
) => {
  const schema = getAuthTables(options);

  function getField(model: string, field: string) {
    if (field === "id") {
      return field;
    }
    const table = schema[model];
    if (!table) {
      throw new AgentStackError(
        "DRIZZLE_TABLE_MISSING",
        `Table ${model} not found in schema`,
      );
    }
    const f = table.fields[field];
    if (!f) {
      throw new AgentStackError(
        "DRIZZLE_FIELD_MISSING",
        `Field ${field} not found in table ${model}`,
      );
    }
    return f.fieldName || field;
  }

  function getSchema(modelName: string) {
    const schema = config.schema || db._.fullSchema;
    if (!schema) {
      throw new AgentStackError(
        "DRIZZLE_SCHEMA_MISSING",
        "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.",
      );
    }
    const model = getModelName(modelName);
    const schemaModel = schema[model];
    if (!schemaModel) {
      throw new AgentStackError(
        "DRIZZLE_MODEL_MISSING",
        `[# Drizzle Adapter]: The model "${model}" was not found in the schema object. Please pass the schema directly to the adapter options.`,
      );
    }
    return schemaModel;
  }

  const getModelName = (model: string) => {
    const table = schema[model];
    if (!table) {
      throw new AgentStackError(
        "DRIZZLE_TABLE_MISSING",
        `Table ${model} not found in schema`,
      );
    }
    return table.modelName !== model
      ? table.modelName
      : config.usePlural
        ? `${model}s`
        : model;
  };

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
        throw new AgentStackError(
          "DRIZZLE_FIELD_MISSING",
          `The field "${w.field}" does not exist in the schema for the model "${model}". Please update your schema.`,
        );
      }
      if (w.operator === "in") {
        if (!Array.isArray(w.value)) {
          throw new AgentStackError(
            "DRIZZLE_INVALID_OPERATOR",
            `The value for the field "${w.field}" must be an array when using the "in" operator.`,
          );
        }
        return [inArray(schemaModel[field], w.value)];
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
        return [lt(schemaModel[field], w.value)];
      }

      if (w.operator === "lte") {
        return [lte(schemaModel[field], w.value)];
      }

      return [eq(schemaModel[field], w.value)];
    }
    const andGroup = where.filter((w) => w.connector === "AND" || !w.connector);
    const orGroup = where.filter((w) => w.connector === "OR");

    const andClause = and(
      ...andGroup.map((w) => {
        const field = getField(model, w.field);
        if (w.operator === "in") {
          if (!Array.isArray(w.value)) {
            throw new AgentStackError(
              "DRIZZLE_INVALID_OPERATOR",
              `The value for the field "${w.field}" must be an array when using the "in" operator.`,
            );
          }
          return inArray(schemaModel[field], w.value);
        }
        return eq(schemaModel[field], w.value);
      }),
    );
    const orClause = or(
      ...orGroup.map((w) => {
        const field = getField(model, w.field);
        return eq(schemaModel[field], w.value);
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
        throw new AgentStackError(
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
        transformedData[fieldAttr.fieldName || field] = withApplyDefault(
          value,
          fieldAttr,
          action,
        );
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
        throw new AgentStackError(
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
          transformedData[key] = base[field.fieldName || key];
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
  /* biome-ignore lint/suspicious/noExplicitAny: Drizzle schema uses table metadata with complex generics. */
  schema?: Record<string, any>;
  /**
   * The database provider
   */
  provider: "pg" | "mysql" | "sqlite";
  /**
   * If the table names in the schema are plural
   * set this to true. For example, if the schema
   * has an object with a key "users" instead of "user"
   */
  usePlural?: boolean;
}

function checkMissingFields(
  /* biome-ignore lint/suspicious/noExplicitAny: Schema validation requires iterating over Drizzle column metadata. */
  schema: Record<string, any>,
  model: string,
  values: Record<string, unknown>,
) {
  if (!schema) {
    throw new AgentStackError(
      "DRIZZLE_SCHEMA_MISSING",
      "Drizzle adapter failed to initialize. Schema not found. Please provide a schema object in the adapter options object.",
    );
  }
  for (const key in values) {
    if (!schema[key]) {
      throw new AgentStackError(
        "DRIZZLE_FIELD_MISSING",
        `The field "${key}" does not exist in the "${model}" schema. Please update your drizzle schema or re-generate using "npx agent-stack/cli generate".`,
      );
    }
  }
}

export const drizzleAdapter =
  (db: DB, config: DrizzleAdapterConfig) =>
  (options: Omit<AgentStackOptions, "agents">) => {
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
          throw new AgentStackError(
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
        return maybe.changes ?? maybe.rowsAffected ?? maybe.length ?? 0;
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
        return maybe.changes ?? maybe.rowsAffected ?? maybe.length ?? 0;
      },
      options: config,
    } satisfies Adapter;
  };
