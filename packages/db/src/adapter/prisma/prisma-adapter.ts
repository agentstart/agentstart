/* agent-frontmatter:start
AGENT: Agent persistence adapter
PURPOSE: Implements the Prisma adapter translating AgentStart operations into Prisma queries.
USAGE: Provide a Prisma client to persist agent data through Prisma ORM.
EXPORTS: PrismaConfig, prismaAdapter
FEATURES:
  - Transforms agent filters into Prisma where clauses
  - Handles pagination and ordering for memory retrieval
SEARCHABLE: packages, agentstart, src, db, adapter, prisma, persistence
agent-frontmatter:end */

/**
 * IMPORTANT: Type Safety Note for Prisma Adapter
 *
 * The Prisma client exposes dynamically generated methods for each model in your schema.
 * Since these methods are created at runtime based on your Prisma schema, they cannot
 * be statically typed. We use explicit `any` here to allow dynamic model access while
 * maintaining type safety at the AgentStart adapter level through transformInput/transformOutput.
 *
 * This is a justified use of `any` because:
 * - Prisma models are generated dynamically from schema.prisma
 * - The actual type safety is provided by our transformation layer
 * - Alternative approaches (conditional types, mapped types) would be more complex and fragile
 * - The AgentStart public API remains fully type-safe despite internal any usage
 */

import type {
  AgentStartOptions,
  MemoryAdapter,
  Where,
} from "@agentstart/types";
import { AgentStartError, generateId } from "@agentstart/utils";
import { getTables } from "../../get-tables";
import {
  compareValues,
  createGetFieldFunction,
  validateTable,
} from "../shared";
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
  options: Omit<AgentStartOptions, "agent">,
) => {
  const schema = getTables(options);
  const getField = createGetFieldFunction(schema, "prisma");

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
    const table = validateTable(schema, model, "prisma");
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
        throw new AgentStartError(
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
        throw new AgentStartError(
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

export const prismaAdapter =
  (prisma: PrismaClient, config: PrismaConfig) =>
  (options: Omit<AgentStartOptions, "agent">) => {
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
                const comparison = compareValues(a[fieldName], b[fieldName], {
                  caseInsensitive: true,
                });
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
          throw new AgentStartError(
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
    } satisfies MemoryAdapter;
  };
