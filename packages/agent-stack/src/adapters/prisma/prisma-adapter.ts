/** biome-ignore-all lint/suspicious/noExplicitAny: is fine */
import { AgentStackError, generateId } from "@agent-stack/utils";
import { getTables } from "../../db";
import type { Adapter, AgentStackOptions, Where } from "../../types";
import { withApplyDefault } from "../utils";

export interface PrismaConfig {
  /**
   * Database provider.
   */
  provider:
    | "sqlite"
    | "cockroachdb"
    | "mysql"
    | "postgresql"
    | "sqlserver"
    | "mongodb";
}

type PrismaClient = object;

interface PrismaClientInternal {
  [model: string]: {
    create: (data: any) => Promise<any>;
    findFirst: (data: any) => Promise<any>;
    findMany: (data: any) => Promise<any>;
    update: (data: any) => Promise<any>;
    upsert?: (data: any) => Promise<any>;
    delete: (data: any) => Promise<any>;
    [key: string]: any;
  };
}

const createTransform = (
  _config: PrismaConfig,
  options: Omit<AgentStackOptions, "agent">,
) => {
  const schema = getTables(options);

  function getField(model: string, field: string) {
    if (field === "id") {
      return field;
    }
    const table = schema[model];
    if (!table) {
      throw new AgentStackError(
        "PRISMA_TABLE_MISSING",
        `Table ${model} not found in schema`,
      );
    }
    const f = table.fields[field];
    if (!f) {
      throw new AgentStackError(
        "PRISMA_FIELD_MISSING",
        `Field ${field} not found in table ${model}`,
      );
    }
    return f.fieldName || field;
  }

  function operatorToPrismaOperator(operator: string) {
    switch (operator) {
      case "starts_with":
        return "startsWith";
      case "ends_with":
        return "endsWith";
      default:
        return operator;
    }
  }

  function getModelName(model: string) {
    const table = schema[model];
    if (!table) {
      throw new AgentStackError(
        "PRISMA_TABLE_MISSING",
        `Table ${model} not found in schema`,
      );
    }
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
        throw new AgentStackError(
          "PRISMA_TABLE_MISSING",
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
        if (
          value === undefined &&
          (!fieldAttr.defaultValue || action === "update")
        ) {
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
      data: Record<string, any>,
      model: string,
      select: string[] = [],
    ) {
      if (!data) return null;
      const transformedData: Record<string, any> =
        data.id || data._id
          ? select.length === 0 || select.includes("id")
            ? {
                id: data.id,
              }
            : {}
          : {};
      const table = schema[model];
      if (!table) {
        throw new AgentStackError(
          "PRISMA_TABLE_MISSING",
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
          transformedData[key] = data[field.fieldName || key];
        }
      }
      return transformedData as any;
    },
    convertWhereClause(model: string, where?: Where[]) {
      if (!where) return {};
      if (where.length === 1) {
        const w = where[0];
        if (!w) {
          return;
        }
        return {
          [getField(model, w.field)]:
            w.operator === "eq" || !w.operator
              ? w.value
              : {
                  [operatorToPrismaOperator(w.operator)]: w.value,
                },
        };
      }
      const and = where.filter((w) => w.connector === "AND" || !w.connector);
      const or = where.filter((w) => w.connector === "OR");
      const andClause = and.map((w) => {
        return {
          [getField(model, w.field)]:
            w.operator === "eq" || !w.operator
              ? w.value
              : {
                  [operatorToPrismaOperator(w.operator)]: w.value,
                },
        };
      });
      const orClause = or.map((w) => {
        return {
          [getField(model, w.field)]: {
            [w.operator || "eq"]: w.value,
          },
        };
      });

      return {
        ...(andClause.length ? { AND: andClause } : {}),
        ...(orClause.length ? { OR: orClause } : {}),
      };
    },
    convertSelect: (select?: string[], model?: string) => {
      if (!select || !model) return undefined;
      return select.reduce((prev, cur) => {
        return {
          ...prev,
          [getField(model, cur)]: true,
        };
      }, {});
    },
    getModelName,
    getField,
  };
};

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
    return value.toLowerCase();
  }
  return value === null || value === undefined
    ? ""
    : String(value).toLowerCase();
};

const compareValues = (left: unknown, right: unknown): number => {
  const leftComparable = toComparable(left);
  const rightComparable = toComparable(right);
  if (
    typeof leftComparable === "string" &&
    typeof rightComparable === "string"
  ) {
    return leftComparable.localeCompare(rightComparable);
  }
  const leftNumber =
    typeof leftComparable === "number"
      ? leftComparable
      : Number(leftComparable);
  const rightNumber =
    typeof rightComparable === "number"
      ? rightComparable
      : Number(rightComparable);
  return leftNumber - rightNumber;
};

export const prismaAdapter =
  (prisma: PrismaClient, config: PrismaConfig) =>
  (options: Omit<AgentStackOptions, "agent">) => {
    const db = prisma as PrismaClientInternal;
    const {
      transformInput,
      transformOutput,
      convertWhereClause,
      convertSelect,
      getModelName,
      getField,
    } = createTransform(config, options);
    return {
      id: "prisma",
      async create(data) {
        const { model, data: values, select } = data;
        const transformed = transformInput(values, model, "create");
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const result = await prismaModel.create({
          data: transformed,
          select: convertSelect(select, model),
        });
        return transformOutput(result, model, select);
      },
      async findOne(data) {
        const { model, where, select } = data;
        const whereClause = convertWhereClause(model, where);
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const result = await prismaModel.findFirst({
          where: whereClause,
          select: convertSelect(select, model),
        });
        return transformOutput(result, model, select);
      },
      async findMany(data) {
        const { model, where, limit, offset, sortBy } = data;
        const whereClause = convertWhereClause(model, where);
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }

        const result = (await prismaModel.findMany({
          where: whereClause,
          take: limit || 100,
          skip: offset || 0,
          ...(sortBy?.field
            ? {
                orderBy: {
                  [getField(model, sortBy.field)]:
                    sortBy.direction === "desc" ? "desc" : "asc",
                },
              }
            : {}),
        })) as Array<Record<string, unknown>>;

        const orderedResults =
          sortBy?.field && result.length
            ? [...result].sort((a, b) => {
                const fieldName = getField(model, sortBy.field);
                const comparison = compareValues(a[fieldName], b[fieldName]);
                return sortBy.direction === "desc" ? -comparison : comparison;
              })
            : result;

        return orderedResults.map((r) => transformOutput(r, model));
      },
      async count(data) {
        const { model, where } = data;
        const whereClause = convertWhereClause(model, where);
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const result = await prismaModel.count({
          where: whereClause,
        });
        return result;
      },
      async update(data) {
        const { model, where, update } = data;
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const whereClause = convertWhereClause(model, where);
        const transformed = transformInput(update, model, "update");
        const result = await prismaModel.update({
          where: whereClause,
          data: transformed,
        });
        return transformOutput(result, model);
      },
      async upsert(data) {
        const { model, where, create, update } = data;
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const whereClause = convertWhereClause(model, where);
        const transformedUpdate = transformInput(update, model, "update");
        const mergedCreate = { ...create, ...update };
        const transformedCreate = transformInput(mergedCreate, model, "create");

        if (typeof prismaModel.upsert === "function") {
          const result = await prismaModel.upsert({
            where: whereClause,
            create: transformedCreate,
            update: transformedUpdate,
          });
          return transformOutput(result, model);
        }

        try {
          const updated = await prismaModel.update({
            where: whereClause,
            data: transformedUpdate,
          });
          return transformOutput(updated, model);
        } catch (error) {
          const maybeKnownError = error as { code?: string } | undefined;
          if (!maybeKnownError || maybeKnownError.code !== "P2025") {
            throw error;
          }
        }

        const created = await prismaModel.create({
          data: transformedCreate,
        });
        return transformOutput(created, model);
      },
      async updateMany(data) {
        const { model, where, update } = data;
        const whereClause = convertWhereClause(model, where);
        const transformed = transformInput(update, model, "update");
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const result = await prismaModel.updateMany({
          where: whereClause,
          data: transformed,
        });
        return result ? (result.count as number) : 0;
      },
      async delete(data) {
        const { model, where } = data;
        const whereClause = convertWhereClause(model, where);
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        try {
          await prismaModel.delete({
            where: whereClause,
          });
        } catch (_e) {
          // If the record doesn't exist, we don't want to throw an error
        }
      },
      async deleteMany(data) {
        const { model, where } = data;
        const whereClause = convertWhereClause(model, where);
        const modelName = getModelName(model);
        const prismaModel = db[modelName];
        if (!prismaModel) {
          throw new AgentStackError(
            "PRISMA_MODEL_MISSING",
            `Model ${model} does not exist in the database. If you haven't generated the Prisma client, you need to run 'npx prisma generate'`,
          );
        }
        const result = await prismaModel.deleteMany({
          where: whereClause,
        });
        return result ? (result.count as number) : 0;
      },
      options: config,
    } satisfies Adapter;
  };
