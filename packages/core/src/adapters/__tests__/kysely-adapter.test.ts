import type { Kysely } from "kysely";
import { describe, expect, it } from "vitest";

import { type KyselyAdapterUserOptions, kyselyAdapter } from "../kysely";

type GenericDatabase = Record<string, Record<string, unknown>>;

type Operation = { op: string; [key: string]: unknown };

const baseContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;

function createKyselyStub() {
  const operations: Operation[] = [];
  const selectResult = [{ id: "result" }];

  const buildSelectQuery = () => {
    const promise = Promise.resolve().then(() => {
      operations.push({ op: "select.execute" });
      return selectResult;
    }) as Promise<unknown[]> & {
      where: (condition: unknown) => typeof promise;
      limit: (value: number) => typeof promise;
      offset: (offset: number) => typeof promise;
      orderBy: (expr: unknown, direction: unknown) => typeof promise;
      execute: () => Promise<unknown[]>;
      executeTakeFirst: () => Promise<unknown>;
    };

    promise.where = (condition: unknown) => {
      operations.push({ op: "select.where", condition });
      return promise;
    };
    promise.limit = (value: number) => {
      operations.push({ op: "select.limit", value });
      return promise;
    };
    promise.offset = (offset: number) => {
      operations.push({ op: "select.offset", offset });
      return promise;
    };
    promise.orderBy = (expr: unknown, direction: unknown) => {
      operations.push({ op: "select.orderBy", expr, direction });
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

  type SelectQuery = ReturnType<typeof buildSelectQuery>;
  interface KyselyExecutorStub {
    selectFrom(table: string): {
      selectAll(): SelectQuery;
      select(selection: unknown): SelectQuery;
    };
    insertInto(table: string): {
      values(record: Record<string, unknown>): {
        returningAll(): {
          execute(): Promise<Record<string, unknown>[]>;
          executeTakeFirst(): Promise<Record<string, unknown>>;
        };
      };
    };
    updateTable(table: string): {
      set(changes: Record<string, unknown>): {
        where(condition: unknown): {
          returningAll(): {
            execute(): Promise<Record<string, unknown>[]>;
            executeTakeFirst(): Promise<Record<string, unknown>>;
          };
          executeTakeFirst(): Promise<Record<string, unknown>>;
        };
      };
    };
    deleteFrom(table: string): {
      where(condition: unknown): {
        returningAll(): {
          execute(): Promise<Record<string, unknown>[]>;
          executeTakeFirst(): Promise<Record<string, unknown>>;
        };
        executeTakeFirst(): Promise<Record<string, unknown>>;
      };
    };
    transaction(): {
      execute<T>(
        callback: (trx: Kysely<GenericDatabase>) => Promise<T>,
      ): Promise<T>;
    };
  }

  const rawDb: KyselyExecutorStub = {
    selectFrom: (table: string) => {
      operations.push({ op: "selectFrom", table });
      const query = buildSelectQuery();
      return {
        selectAll: () => {
          operations.push({ op: "selectAll" });
          return query;
        },
        select: (selection: unknown) => {
          operations.push({ op: "select", selection });
          return query;
        },
      };
    },
    insertInto: (table: string) => {
      operations.push({ op: "insertInto", table });
      return {
        values: (record: Record<string, unknown>) => {
          operations.push({ op: "insert.values", record });
          return {
            returningAll: () => ({
              execute: async () => {
                operations.push({ op: "insert.returningAll.execute" });
                return [{ ...record }];
              },
              executeTakeFirst: async () => {
                operations.push({ op: "insert.returningAll.executeTakeFirst" });
                return { ...record };
              },
            }),
          };
        },
      };
    },
    updateTable: (table: string) => {
      operations.push({ op: "updateTable", table });
      return {
        set: (changes: Record<string, unknown>) => {
          operations.push({ op: "update.set", changes });
          return {
            where: (condition: unknown) => {
              operations.push({ op: "update.where", condition });
              return {
                returningAll: () => ({
                  execute: async () => {
                    operations.push({ op: "update.returningAll.execute" });
                    return [{ ...changes }];
                  },
                  executeTakeFirst: async () => {
                    operations.push({
                      op: "update.returningAll.executeTakeFirst",
                    });
                    return { ...changes };
                  },
                }),
                executeTakeFirst: async () => {
                  operations.push({ op: "update.executeTakeFirst" });
                  return { ...changes };
                },
              };
            },
          };
        },
      };
    },
    deleteFrom: (table: string) => {
      operations.push({ op: "deleteFrom", table });
      return {
        where: (condition: unknown) => {
          operations.push({ op: "delete.where", condition });
          return {
            returningAll: () => ({
              execute: async () => {
                operations.push({ op: "delete.returningAll.execute" });
                return [{ deleted: true }];
              },
              executeTakeFirst: async () => {
                operations.push({ op: "delete.returningAll.executeTakeFirst" });
                return { deleted: true };
              },
            }),
            executeTakeFirst: async () => {
              operations.push({ op: "delete.executeTakeFirst" });
              return { deleted: true };
            },
          };
        },
      };
    },
    transaction: () => ({
      async execute<T>(
        callback: (trx: Kysely<GenericDatabase>) => Promise<T>,
      ): Promise<T> {
        operations.push({ op: "transaction.execute" });
        return callback(rawDb as unknown as Kysely<GenericDatabase>);
      },
    }),
  };

  return { operations, db: rawDb as unknown as Kysely<GenericDatabase> };
}

describe("kyselyAdapter", () => {
  const stub = createKyselyStub();

  const options: KyselyAdapterUserOptions = {
    provider: "postgresql",
    camelCase: true,
    usePlural: false,
    transaction: true,
  };

  const adapter = kyselyAdapter(stub.db, options);
  const methods = adapter.initialize({ ...baseContext });

  it("executes CRUD and bulk helpers through Kysely", async () => {
    const inserted = await methods.create({
      model: "account",
      data: { id: "1", status: "active" },
    });
    expect(inserted).toMatchObject({ id: "1", status: "active" });

    const fetched = await methods.findOne({
      model: "account",
      where: [{ field: "id", value: "1" }],
    });
    expect(fetched).toEqual({ id: "result" });

    const rows = await methods.findMany({
      model: "account",
      where: [{ field: "status", value: "active" }],
      sortBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
      offset: 0,
    });
    expect(rows).toEqual([{ id: "result" }]);

    const counted = await methods.count({
      model: "account",
      where: [{ field: "status", value: "active" }],
    });
    expect(counted).toBe(0);

    await methods.update({
      model: "account",
      where: [{ field: "id", value: "1" }],
      update: { status: "inactive" },
    });

    const updatedMany = await methods.updateMany({
      model: "account",
      where: [{ field: "status", value: "inactive" }],
      update: { tags: ["trusted"] },
    });
    expect(updatedMany).toBe(1);

    await methods.delete({
      model: "account",
      where: [{ field: "id", value: "1" }],
    });

    const deletedMany = await methods.deleteMany({
      model: "account",
      where: [{ field: "status", value: "inactive" }],
    });
    expect(deletedMany).toBe(1);

    expect(stub.operations.some((entry) => entry.op === "select.where")).toBe(
      true,
    );
  });

  it("supports transactional execution", async () => {
    const result = await methods.transaction?.(async (adapterMethods) => {
      await adapterMethods.count({ model: "account" });
      return "done";
    });

    expect(result).toBe("done");
    expect(
      stub.operations.some((entry) => entry.op === "transaction.execute"),
    ).toBe(true);
  });
});
