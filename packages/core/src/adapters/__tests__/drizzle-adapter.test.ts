import type { AnyColumn } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import { type DrizzleAdapterUserOptions, drizzleAdapter } from "../drizzle";
import { baseAdapterContext } from "./shared/context";
import { runAdapterSuite } from "./shared/run-adapter-suite";

type Operation = { op: string; [key: string]: unknown };

const DRIZZLE_ORIGINAL_NAME = Symbol.for("drizzle:OriginalName");

function createColumn(): AnyColumn {
  return { table: {} } as unknown as AnyColumn;
}

type TableStub = Record<string | symbol, unknown>;

function createTable(name: string, fields: string[]): TableStub {
  const base: Record<string | symbol, unknown> = {
    toString: () => name,
    [DRIZZLE_ORIGINAL_NAME]: name,
  };

  for (const field of fields) {
    base[field] = createColumn();
  }

  return base;
}

function tableName(table: TableStub): string {
  const original = table[DRIZZLE_ORIGINAL_NAME];
  return typeof original === "string" ? original : table.toString();
}

function createDrizzleStub() {
  const operations: Operation[] = [];
  const selectResult = [{ id: "result" }];

  const makeSelectQuery = () => {
    const promise = Promise.resolve().then(() => {
      operations.push({ op: "select.execute" });
      return selectResult;
    }) as Promise<unknown[]> & {
      where: (condition: unknown) => typeof promise;
      limit: (limitValue: number) => typeof promise;
      offset: (offsetValue: number) => typeof promise;
      orderBy: (...orderExprs: unknown[]) => typeof promise;
      execute: () => Promise<unknown[]>;
      executeTakeFirst: () => Promise<unknown>;
    };

    promise.where = (condition: unknown) => {
      operations.push({ op: "select.where", condition });
      return promise;
    };
    promise.limit = (limitValue: number) => {
      operations.push({ op: "select.limit", limitValue });
      return promise;
    };
    promise.offset = (offsetValue: number) => {
      operations.push({ op: "select.offset", offsetValue });
      return promise;
    };
    promise.orderBy = (...orderExprs: unknown[]) => {
      operations.push({ op: "select.orderBy", orderExprs });
      return promise;
    };
    promise.execute = async () => {
      operations.push({ op: "select.execute" });
      return selectResult;
    };
    promise.executeTakeFirst = async () => {
      operations.push({ op: "select.executeTakeFirst" });
      return selectResult[0];
    };

    return promise;
  };

  type SelectQuery = ReturnType<typeof makeSelectQuery>;
  interface Executor {
    insert(table: TableStub): {
      values(record: Record<string, unknown>): {
        returning(): Promise<unknown[]>;
        execute(): Promise<void>;
      };
    };
    update(table: TableStub): {
      set(changes: Record<string, unknown>): {
        where(condition: unknown): {
          returning(): Promise<unknown[]>;
          execute(): Promise<void>;
        };
      };
    };
    delete(table: TableStub): {
      where(condition: unknown): {
        returning(): Promise<unknown[]>;
        execute(): Promise<void>;
      };
    };
    select(): {
      from(table: TableStub): SelectQuery;
    };
    transaction(callback: (tx: Executor) => Promise<unknown>): Promise<unknown>;
  }

  const executor: Executor = {
    insert: (table: TableStub) => ({
      values: (record: Record<string, unknown>) => {
        operations.push({
          op: "insert.values",
          table: tableName(table),
          record,
        });
        const payload = { ...record, id: record.id ?? "generated" };
        return {
          returning: async () => {
            operations.push({ op: "insert.returning" });
            return [payload];
          },
          execute: async () => {
            operations.push({ op: "insert.execute" });
            return undefined;
          },
        };
      },
    }),
    update: (table: TableStub) => ({
      set: (changes: Record<string, unknown>) => {
        operations.push({ op: "update.set", table: tableName(table), changes });
        return {
          where: (condition: unknown) => {
            operations.push({ op: "update.where", condition });
            return {
              returning: async () => {
                operations.push({ op: "update.returning" });
                return [{ ...changes }];
              },
              execute: async () => {
                operations.push({ op: "update.execute" });
                return undefined;
              },
            };
          },
        };
      },
    }),
    delete: (table: TableStub) => ({
      where: (condition: unknown) => {
        operations.push({
          op: "delete.where",
          table: tableName(table),
          condition,
        });
        return {
          returning: async () => {
            operations.push({ op: "delete.returning" });
            return [{ deleted: true }];
          },
          execute: async () => {
            operations.push({ op: "delete.execute" });
            return undefined;
          },
        };
      },
    }),
    select: () => ({
      from: (table: TableStub) => {
        operations.push({ op: "select.from", table: tableName(table) });
        return makeSelectQuery();
      },
    }),
    transaction: async (callback: (tx: Executor) => Promise<unknown>) => {
      operations.push({ op: "transaction" });
      return callback(executor);
    },
  };
  return { operations, executor };
}

const tables = {
  users: createTable("users", ["id", "status", "tags", "created_at"]),
} satisfies Record<string, TableStub>;
const schema = tables as unknown as Record<string, unknown>;

const defaultOptions: DrizzleAdapterUserOptions = {
  provider: "pg",
  schema: schema as never,
  usePlural: false,
  camelCase: true,
  transaction: true,
};

function buildDrizzleInstance(overrides?: {
  getFieldAttributes?: (
    model: string,
    field: string,
  ) => Record<string, unknown>;
}) {
  const stub = createDrizzleStub();
  const adapter = drizzleAdapter(stub.executor as never, defaultOptions);
  const context = {
    ...baseAdapterContext,
    schema,
    ...(overrides?.getFieldAttributes
      ? { getFieldAttributes: overrides.getFieldAttributes }
      : {}),
  };
  const methods = adapter.initialize(context);
  return { stub, methods };
}

runAdapterSuite({
  name: "drizzleAdapter",
  createAdapter: () => buildDrizzleInstance().methods,
  scenario: {
    create: { model: "users", data: { id: "1", status: "active" } },
    findOne: {
      model: "users",
      where: [{ field: "id", value: "1" }],
    },
    findMany: {
      model: "users",
      where: [{ field: "status", value: "active" }],
      sortBy: [{ field: "created_at", direction: "desc" }],
      offset: 0,
      limit: 10,
    },
    count: {
      model: "users",
      where: [{ field: "status", value: "active" }],
    },
    update: {
      model: "users",
      where: [{ field: "id", value: "1" }],
      update: { status: "inactive" },
    },
    updateMany: {
      model: "users",
      where: [{ field: "status", value: "inactive" }],
      update: { tags: ["beta"] },
    },
    delete: {
      model: "users",
      where: [{ field: "id", value: "1" }],
    },
    deleteMany: {
      model: "users",
      where: [{ field: "status", value: "inactive" }],
    },
    upsert: {
      model: "users",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", status: "archived" },
      update: { status: "archived" },
    },
  },
  assertions: {
    create: (record) => expect(record).toMatchObject({ id: "1" }),
    findOne: (record) => expect(record).toEqual({ id: "result" }),
    findMany: (records) => expect(records).toEqual([{ id: "result" }]),
    count: (value) => expect(value).toBe(0),
    update: (record) => expect(record).toMatchObject({ status: "inactive" }),
    updateMany: (value) => expect(value).toBe(1),
    delete: (record) => expect(record).toMatchObject({ deleted: true }),
    deleteMany: (value) => expect(value).toBe(1),
    upsert: (record) => expect(record).toMatchObject({ status: "archived" }),
  },
});

describe("drizzleAdapter", () => {
  const { stub, methods } = buildDrizzleInstance();

  it("handles CRUD and bulk helpers consistently", async () => {
    const created = await methods.create({
      model: "users",
      data: { id: "1", status: "active" },
    });
    expect(created).toMatchObject({ id: "1", status: "active" });

    const fetched = await methods.findOne({
      model: "users",
      where: [{ field: "id", value: "1" }],
    });
    expect(fetched).toEqual({ id: "result" });

    const rows = await methods.findMany({
      model: "users",
      where: [{ field: "status", value: "active" }],
      sortBy: [{ field: "created_at", direction: "desc" }],
      offset: 0,
      limit: 10,
    });
    expect(rows).toEqual([{ id: "result" }]);

    const counted = await methods.count({
      model: "users",
      where: [{ field: "status", value: "active" }],
    });
    expect(counted).toBe(0);

    const updated = await methods.update({
      model: "users",
      where: [{ field: "id", value: "1" }],
      update: { status: "inactive" },
    });
    expect(updated).toMatchObject({ status: "inactive" });

    const updatedMany = await methods.updateMany({
      model: "users",
      where: [{ field: "status", value: "inactive" }],
      update: { tags: ["beta"] },
    });
    expect(updatedMany).toBe(1);

    const deleted = await methods.delete({
      model: "users",
      where: [{ field: "id", value: "1" }],
    });
    expect(deleted).toMatchObject({ deleted: true });

    const deletedMany = await methods.deleteMany({
      model: "users",
      where: [{ field: "status", value: "inactive" }],
    });
    expect(deletedMany).toBe(1);

    const upsertStart = stub.operations.length;
    const upserted = await methods.upsert({
      model: "users",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", status: "archived" },
      update: { status: "archived" },
    });
    expect(upserted).toMatchObject({ status: "archived" });
    const upsertOps = stub.operations
      .slice(upsertStart)
      .map((entry) => entry.op);
    expect(upsertOps).toEqual(
      expect.arrayContaining(["insert.values", "update.set"]),
    );

    expect(stub.operations.map((entry) => entry.op)).toContain("select.where");
  });

  it("wraps transactions when supported", async () => {
    const runSpy = vi.fn().mockResolvedValue("done");
    const result = await methods.transaction?.(async (adapterMethods) => {
      runSpy();
      await adapterMethods.count({ model: "users" });
      return "done";
    });
    expect(runSpy).toHaveBeenCalled();
    expect(result).toBe("done");
  });

  it("applies default field attributes during create operations", async () => {
    const defaults = (model: string, field: string) => {
      if (model === "users" && field === "__fields__") {
        return { status: true };
      }
      if (model === "users" && field === "status") {
        return { defaultValue: "pending" };
      }
      return {};
    };
    const { stub: defaultStub, methods: defaultMethods } = buildDrizzleInstance(
      { getFieldAttributes: defaults },
    );

    await defaultMethods.create({
      model: "users",
      data: { id: "defaults" },
    });

    const insertValues = defaultStub.operations.find(
      (entry) => entry.op === "insert.values",
    ) as Operation | undefined;
    expect(insertValues?.record).toMatchObject({ status: "pending" });
  });
});
