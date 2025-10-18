import { type Db, ObjectId } from "mongodb";
import { getTables } from "@/db";
import { withApplyDefault } from "@/db/adapter/utils";
import type { Adapter, AgentStartOptions, Where } from "@/types";

const createTransform = (options: Omit<AgentStartOptions, "agent">) => {
  const schema = getTables(options);
  /**
   * if custom id gen is provided we don't want to override with object id
   */
  const customIdGen = options.advanced?.generateId;

  function serializeID(field: string, value: unknown, model: string): unknown {
    if (customIdGen) {
      return value;
    }
    const table = schema[model];
    if (!table) {
      throw new Error(`Table ${model} not found in schema`);
    }
    const fieldAttr = table.fields[field];
    if (
      field === "id" ||
      field === "_id" ||
      (fieldAttr && fieldAttr.references?.field === "id")
    ) {
      if (typeof value === "string") {
        try {
          return new ObjectId(value);
        } catch (_e) {
          return value;
        }
      }
      if (value instanceof ObjectId) {
        return value;
      }
      if (Array.isArray(value)) {
        return value.map((item) => serializeID(field, item, model));
      }
      throw new Error("Invalid id value");
    }
    return value;
  }

  function deserializeID(
    field: string,
    value: unknown,
    model: string,
  ): unknown {
    if (customIdGen) {
      return value;
    }
    const table = schema[model];
    if (!table) {
      throw new Error(`Table ${model} not found in schema`);
    }
    const fieldAttr = table.fields[field];
    if (field === "id" || (fieldAttr && fieldAttr.references?.field === "id")) {
      if (value instanceof ObjectId) {
        return value.toHexString();
      }
      if (Array.isArray(value)) {
        return value.map((item) => {
          if (item instanceof ObjectId) {
            return item.toHexString();
          }
          return item;
        });
      }
      return value;
    }
    return value;
  }

  function getField(field: string, model: string): string {
    if (field === "id") {
      if (customIdGen) {
        return "id";
      }
      return "_id";
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
      action: "create" | "update",
    ): Record<string, unknown> {
      const transformedData: Record<string, unknown> =
        action === "update"
          ? {}
          : customIdGen
            ? {
                id: customIdGen({ model }),
              }
            : {
                _id: new ObjectId(),
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
        if (
          field === "id" &&
          action === "create" &&
          typeof customIdGen === "function"
        ) {
          continue;
        }
        if (
          value === undefined &&
          (!fieldAttr.defaultValue || action === "update")
        ) {
          continue;
        }
        transformedData[fieldAttr.fieldName || field] = withApplyDefault(
          serializeID(field, value, model),
          fieldAttr,
          action,
        );
      }

      if (action === "create" && !customIdGen) {
        const assignedId = transformedData.id;
        if (assignedId !== undefined) {
          transformedData._id = assignedId;
        }
      }
      return transformedData;
    },
    transformOutput(
      data: Record<string, unknown>,
      model: string,
      select: string[] = [],
    ): Record<string, unknown> {
      const idValue = data.id;
      const objectIdValue = data._id;
      const normalizedId =
        typeof idValue === "string"
          ? idValue
          : objectIdValue instanceof ObjectId
            ? objectIdValue.toHexString()
            : undefined;

      const transformedData: Record<string, unknown> = normalizedId
        ? select.length === 0 || select.includes("id")
          ? {
              id: normalizedId,
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
          const fieldName = field.fieldName || key;
          const rawValue =
            key === "id" && data[fieldName] === undefined
              ? data._id
              : data[fieldName];
          transformedData[key] = deserializeID(key, rawValue, model);
        }
      }
      return transformedData;
    },
    convertWhereClause(where: Where[], model: string): Record<string, unknown> {
      if (!where.length) return {};
      const conditions = where.map((w) => {
        const { field: _field, value, operator = "eq", connector = "AND" } = w;
        const field = getField(_field, model);
        const condition: Record<string, unknown> = {};

        switch (operator.toLowerCase()) {
          case "eq":
            condition[field] = serializeID(_field, value, model);
            break;
          case "in": {
            const serialized = Array.isArray(value)
              ? (value as unknown[]).map((item) =>
                  serializeID(_field, item, model),
                )
              : [serializeID(_field, value, model)];
            condition[field] = {
              $in: serialized,
            };
            break;
          }
          case "gt":
            condition[field] = { $gt: value };
            break;
          case "gte":
            condition[field] = { $gte: value };
            break;
          case "lt":
            condition[field] = { $lt: value };
            break;
          case "lte":
            condition[field] = { $lte: value };
            break;
          case "ne":
            condition[field] = { $ne: value };
            break;
          case "contains":
            condition[field] = { $regex: `.*${value}.*` };
            break;
          case "starts_with":
            condition[field] = { $regex: `${value}.*` };
            break;
          case "ends_with":
            condition[field] = { $regex: `.*${value}` };
            break;
          default:
            throw new Error(`Unsupported operator: ${operator}`);
        }
        return { condition, connector };
      });
      if (conditions.length === 1) {
        const firstCondition = conditions[0];
        if (!firstCondition) {
          return {};
        }
        return firstCondition.condition;
      }
      const andConditions = conditions
        .filter((c) => c.connector === "AND")
        .map((c) => c.condition);
      const orConditions = conditions
        .filter((c) => c.connector === "OR")
        .map((c) => c.condition);

      let clause: Record<string, unknown> = {};
      if (andConditions.length) {
        clause = { ...clause, $and: andConditions };
      }
      if (orConditions.length) {
        clause = { ...clause, $or: orConditions };
      }
      return clause;
    },
    getModelName: (model: string): string => {
      const table = schema[model];
      if (!table) {
        throw new Error(`Table ${model} not found in schema`);
      }
      return table.modelName;
    },
    getField,
  };
};

export const mongodbAdapter =
  (db: Db) => (options: Omit<AgentStartOptions, "agent">) => {
    const transform = createTransform(options);
    const hasCustomId = options.advanced?.generateId;
    return {
      id: "mongodb-adapter",
      async create<T extends Record<string, unknown>, R = T>(data: {
        model: string;
        data: T;
        select?: string[];
      }): Promise<R> {
        const { model, data: values, select } = data;
        const transformedData = transform.transformInput(
          values,
          model,
          "create",
        );
        const generatedId = transformedData.id;
        if (generatedId && !hasCustomId) {
          delete (transformedData as Record<string, unknown>).id;
        }
        const res = await db
          .collection(transform.getModelName(model))
          .insertOne(transformedData);
        const id = res.insertedId;
        const insertedData: Record<string, unknown> = {
          id: id.toString(),
          ...transformedData,
        };
        const t = transform.transformOutput(insertedData, model, select);
        return t as R;
      },
      async findOne<T>(data: {
        model: string;
        where: Where[];
        select?: string[];
      }): Promise<T | null> {
        const { model, where, select } = data;
        const clause = transform.convertWhereClause(where, model);
        const res = await db
          .collection(transform.getModelName(model))
          .findOne(clause);
        if (!res) return null;
        const transformedData = transform.transformOutput(
          res as Record<string, unknown>,
          model,
          select,
        );
        return transformedData as T;
      },
      async findMany<T>(data: {
        model: string;
        where?: Where[];
        limit?: number;
        sortBy?: { field: string; direction: "asc" | "desc" };
        offset?: number;
      }): Promise<T[]> {
        const { model, where, limit, offset, sortBy } = data;
        const clause = where ? transform.convertWhereClause(where, model) : {};
        const cursor = db
          .collection(transform.getModelName(model))
          .find(clause);
        if (limit) cursor.limit(limit);
        if (offset) cursor.skip(offset);
        if (sortBy) {
          cursor.collation({ locale: "en", strength: 2 });
          cursor.sort(
            transform.getField(sortBy.field, model),
            sortBy.direction === "desc" ? -1 : 1,
          );
        }
        const res = await cursor.toArray();
        return res.map((r) =>
          transform.transformOutput(r as Record<string, unknown>, model),
        ) as T[];
      },
      async count(data) {
        const { model } = data;
        const res = await db
          .collection(transform.getModelName(model))
          .countDocuments();
        return res;
      },
      async update<T>(data: {
        model: string;
        where: Where[];
        update: Record<string, unknown>;
      }): Promise<T | null> {
        const { model, where, update: values } = data;
        const clause = transform.convertWhereClause(where, model);

        const transformedData = transform.transformInput(
          values,
          model,
          "update",
        );

        const result = await db
          .collection(transform.getModelName(model))
          .findOneAndUpdate(
            clause,
            { $set: transformedData },
            {
              returnDocument: "after",
            },
          );
        const updated =
          result && typeof result === "object" && "value" in result
            ? (result.value as Record<string, unknown> | null)
            : (result as Record<string, unknown> | null);
        if (!updated) return null;
        return transform.transformOutput(updated, model) as T;
      },
      async updateMany(data) {
        const { model, where, update: values } = data;
        const clause = transform.convertWhereClause(where, model);
        const transformedData = transform.transformInput(
          values,
          model,
          "update",
        );
        const res = await db
          .collection(transform.getModelName(model))
          .updateMany(clause, { $set: transformedData });
        return res.modifiedCount;
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
        const clause = transform.convertWhereClause(where, model);
        const collection = db.collection(transform.getModelName(model));

        const transformedUpdate = transform.transformInput(
          update,
          model,
          "update",
        );

        const transformedCreate = transform.transformInput(
          create,
          model,
          "create",
        );

        const generatedId = transformedCreate.id;
        if (generatedId && !hasCustomId) {
          delete (transformedCreate as Record<string, unknown>).id;
        }

        const updateDocument: Record<string, unknown> = {};
        if (Object.keys(transformedUpdate).length > 0) {
          updateDocument.$set = transformedUpdate;
        }

        // Only include fields in $setOnInsert that are not in $set to avoid conflicts
        const createOnlyFields: Record<string, unknown> = {};
        for (const key in transformedCreate) {
          if (!(key in transformedUpdate)) {
            createOnlyFields[key] = transformedCreate[key];
          }
        }

        if (Object.keys(createOnlyFields).length > 0) {
          updateDocument.$setOnInsert = createOnlyFields;
        }

        if (Object.keys(updateDocument).length === 0) {
          return null;
        }

        const result = await collection.findOneAndUpdate(
          clause,
          updateDocument,
          {
            upsert: true,
            returnDocument: "after",
          },
        );

        const document =
          result && typeof result === "object" && "value" in result
            ? (result.value as Record<string, unknown> | null)
            : (result as Record<string, unknown> | null);

        if (!document) {
          return null;
        }

        return transform.transformOutput(document, model) as T;
      },
      async delete(data: { model: string; where: Where[] }): Promise<void> {
        const { model, where } = data;
        const clause = transform.convertWhereClause(where, model);
        await db
          .collection(transform.getModelName(model))
          .findOneAndDelete(clause);
      },
      async deleteMany(data) {
        const { model, where } = data;
        const clause = transform.convertWhereClause(where, model);
        const res = await db
          .collection(transform.getModelName(model))
          .deleteMany(clause);
        return res.deletedCount;
      },
    } satisfies Adapter;
  };
