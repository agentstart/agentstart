import type { Db } from "mongodb";
import { describe, expect, it, vi } from "vitest";

import { mongodbAdapter } from "../mongodb";

const baseContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;

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
    find: (filter: unknown) => {
      operations.push({ op: "find", filter });
      return chain;
    },
    countDocuments: async (filter: unknown) => {
      operations.push({ op: "countDocuments", filter });
      return 7;
    },
    findOneAndUpdate: async (filter: unknown, update: unknown) => {
      operations.push({ op: "findOneAndUpdate", filter, update });
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

describe("mongodbAdapter", () => {
  it("translates filters, projections, and write operations", async () => {
    const ops: Operation[] = [];
    const collection = createStubCollection(ops);
    const db = {
      collection: vi.fn(() => collection),
    } as unknown as Db;

    const adapter = mongodbAdapter(db, { camelCase: true, usePlural: true });
    const methods = adapter.initialize({ ...baseContext });

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

    expect(ops).toMatchSnapshot();
  });
});
