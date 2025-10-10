import type { Db } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { mongodbAdapter } from "../mongodb";
import { baseAdapterContext } from "./shared/context";
import { runAdapterSuite } from "./shared/run-adapter-suite";

type Operation = { op: string; [key: string]: unknown };

const createStubCollection = (operations: Operation[]) => {
  const chain = {
    sort(sortDoc: unknown) {
      operations.push({ op: "sort", sortDoc });
      return chain;
    },
    skip(skipValue: unknown) {
      operations.push({ op: "skip", skipValue });
      return chain;
    },
    limit(limitValue: unknown) {
      operations.push({ op: "limit", limitValue });
      return chain;
    },
    toArray: async () => {
      operations.push({ op: "toArray" });
      return [{ id: "result" }];
    },
  };

  return {
    insertOne: async (doc: unknown) => {
      operations.push({ op: "insertOne", doc });
      return { insertedId: "inserted" };
    },
    findOne: async (filter: unknown, options?: unknown) => {
      operations.push({ op: "findOne", filter, options });
      return { id: "found" };
    },
    find: (filter: unknown, options?: unknown) => {
      operations.push({ op: "find", filter, options });
      return chain;
    },
    countDocuments: async (filter: unknown) => {
      operations.push({ op: "countDocuments", filter });
      return 7;
    },
    findOneAndUpdate: async (
      filter: unknown,
      update: unknown,
      options?: unknown,
    ) => {
      operations.push({ op: "findOneAndUpdate", filter, update, options });
      return { value: { updated: true } };
    },
    updateMany: async (filter: unknown, update: unknown) => {
      operations.push({ op: "updateMany", filter, update });
      return { modifiedCount: 3 };
    },
    findOneAndDelete: async (filter: unknown) => {
      operations.push({ op: "findOneAndDelete", filter });
      return { value: { deleted: true } };
    },
    deleteMany: async (filter: unknown) => {
      operations.push({ op: "deleteMany", filter });
      return { deletedCount: 2 };
    },
  };
};

function buildMongoInstance(overrides?: {
  getFieldAttributes?: (
    model: string,
    field: string,
  ) => Record<string, unknown>;
}) {
  const ops: Operation[] = [];
  const collection = createStubCollection(ops);
  const db = {
    collection: vi.fn(() => collection),
  } as unknown as Db;
  const adapter = mongodbAdapter(db, { camelCase: true, usePlural: true });
  const context = {
    ...baseAdapterContext,
    ...(overrides?.getFieldAttributes
      ? { getFieldAttributes: overrides.getFieldAttributes }
      : {}),
  };
  const methods = adapter.initialize(context);
  return { methods, ops };
}

runAdapterSuite({
  name: "mongodbAdapter",
  createAdapter: () => buildMongoInstance().methods,
  scenario: {
    create: { model: "user", data: { firstName: "Ada" } },
    findOne: {
      model: "user",
      where: [{ field: "firstName", value: "Ada" }],
      select: ["firstName"],
    },
    findMany: {
      model: "user",
      where: [
        { field: "status", value: "active" },
        { field: "tags", value: ["beta"], operator: "in", connector: "OR" },
      ],
      sortBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
      offset: 1,
    },
    count: { model: "user" },
    update: {
      model: "user",
      where: [{ field: "id", value: "1" }],
      update: { status: "inactive" },
    },
    updateMany: {
      model: "user",
      where: [{ field: "status", value: "inactive" }],
      update: { status: "active" },
    },
    delete: {
      model: "user",
      where: [{ field: "id", value: "1" }],
    },
    deleteMany: {
      model: "user",
      where: [{ field: "status", value: "active" }],
    },
    upsert: {
      model: "user",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", status: "active" },
      update: { status: "pending" },
      select: ["status"],
    },
  },
  assertions: {
    create: (record) => expect(record).toMatchObject({ id: "found" }),
    findOne: (record) => expect(record).toEqual({ id: "found" }),
    findMany: (records) => expect(records).toEqual([{ id: "result" }]),
    count: (value) => expect(value).toBe(7),
    update: (record) => expect(record).toEqual({ updated: true }),
    updateMany: (value) => expect(value).toBe(3),
    delete: (record) => expect(record).toEqual({ deleted: true }),
    deleteMany: (value) => expect(value).toBe(2),
    upsert: (record) => expect(record).toEqual({ updated: true }),
  },
});

describe("mongodbAdapter", () => {
  it("translates filters, projections, and write operations", async () => {
    const { ops, methods } = buildMongoInstance();

    await methods.create({ model: "user", data: { firstName: "Ada" } });
    await methods.findOne({
      model: "user",
      where: [{ field: "firstName", value: "Ada" }],
      select: ["firstName"],
    });
    await methods.findMany({
      model: "user",
      where: [
        { field: "status", value: "active" },
        { field: "tags", value: ["beta"], operator: "in", connector: "OR" },
      ],
      sortBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
      offset: 1,
    });
    await methods.count({ model: "user" });
    await methods.update({
      model: "user",
      where: [{ field: "id", value: "1" }],
      update: { status: "inactive" },
    });
    await methods.updateMany({
      model: "user",
      where: [{ field: "status", value: "inactive" }],
      update: { status: "active" },
    });
    await methods.delete({
      model: "user",
      where: [{ field: "id", value: "1" }],
    });
    await methods.deleteMany({
      model: "user",
      where: [{ field: "status", value: "active" }],
    });
    const upserted = await methods.upsert({
      model: "user",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", status: "active" },
      update: { status: "pending" },
      select: ["status"],
    });
    expect(upserted).toEqual({ updated: true });

    expect(ops).toMatchSnapshot();
  });

  it("applies default field attributes on insert", async () => {
    const defaults = (model: string, field: string) => {
      if (model === "user" && field === "__fields__") {
        return { status: true };
      }
      if (model === "user" && field === "status") {
        return { defaultValue: "pending" };
      }
      return {};
    };
    const { ops, methods } = buildMongoInstance({
      getFieldAttributes: defaults,
    });

    await methods.create({
      model: "user",
      data: { firstName: "Grace" },
    });

    const insertOperation = ops.find((entry) => entry.op === "insertOne");
    expect(insertOperation?.doc).toMatchObject({ status: "pending" });
  });
});
