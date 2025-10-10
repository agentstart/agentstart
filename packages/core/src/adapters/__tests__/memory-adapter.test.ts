import { beforeEach, describe, expect, it } from "vitest";

import { memoryAdapter } from "../memory";
import { baseAdapterContext } from "./shared/context";
import { runAdapterSuite } from "./shared/run-adapter-suite";

runAdapterSuite({
  name: "memoryAdapter",
  createAdapter: () =>
    memoryAdapter({ generateId: () => "suite-id" }).initialize({
      ...baseAdapterContext,
    }),
  scenario: {
    create: {
      model: "user",
      data: { id: "suite-id", email: "suite@example.com", status: "active" },
    },
    findOne: {
      model: "user",
      where: [{ field: "id", value: "suite-id" }],
    },
    findMany: {
      model: "user",
      where: [{ field: "status", value: "active" }],
    },
    count: {
      model: "user",
      where: [{ field: "status", value: "active" }],
    },
    update: {
      model: "user",
      where: [{ field: "id", value: "suite-id" }],
      update: { status: "inactive" },
    },
    updateMany: {
      model: "user",
      where: [{ field: "status", value: "inactive" }],
      update: { tags: ["shared"] },
    },
    delete: {
      model: "user",
      where: [{ field: "id", value: "suite-id" }],
    },
    deleteMany: {
      model: "user",
      where: [{ field: "tags", value: ["shared"], operator: "in" }],
    },
    upsert: {
      model: "user",
      where: [{ field: "id", value: "suite-id" }],
      create: {
        id: "suite-id",
        email: "suite@example.com",
        status: "restored",
      },
      update: { status: "restored" },
    },
  },
  assertions: {
    create: (record) =>
      expect(record).toMatchObject({
        id: "suite-id",
        email: "suite@example.com",
      }),
    findOne: (record) =>
      expect(record).toMatchObject({
        id: "suite-id",
        email: "suite@example.com",
      }),
    findMany: (records) => expect(records.length).toBeGreaterThanOrEqual(1),
    count: (value) => expect(value).toBeGreaterThanOrEqual(1),
    update: (record) => expect(record).toMatchObject({ status: "inactive" }),
    updateMany: (count) => expect(count).toBeGreaterThanOrEqual(1),
    delete: (record) => expect(record).toMatchObject({ id: "suite-id" }),
    deleteMany: (count) => expect(count).toBeGreaterThanOrEqual(0),
    upsert: (record) => expect(record).toMatchObject({ status: "restored" }),
  },
});

describe("memoryAdapter", () => {
  const adapter = memoryAdapter({ generateId: () => "generated-id" });
  const methods = adapter.initialize({ ...baseAdapterContext });

  beforeEach(async () => {
    // Recreate the adapter to reset state between tests.
    const fresh = memoryAdapter({ generateId: () => "generated-id" });
    Object.assign(methods, fresh.initialize({ ...baseAdapterContext }));
  });

  it("creates records and auto-generates ids", async () => {
    const created = (await methods.create({
      model: "user",
      data: { email: "foo@example.com" },
    })) as Record<string, unknown>;

    expect(created.id).toBe("generated-id");

    const fetched = await methods.findOne({
      model: "user",
      where: [{ field: "email", value: "foo@example.com" }],
    });
    expect(fetched).toStrictEqual(created);
  });

  it("supports conditional filtering with AND / OR connectors", async () => {
    await methods.create({
      model: "session",
      data: { id: "1", status: "active", tags: ["editor"] },
    });
    await methods.create({
      model: "session",
      data: { id: "2", status: "inactive", tags: ["beta"] },
    });

    const results = (await methods.findMany({
      model: "session",
      where: [
        { field: "status", value: "active", connector: "OR" },
        { field: "tags", value: ["beta"], operator: "in", connector: "OR" },
      ],
    })) as Array<Record<string, unknown>>;
    expect(results.map((record) => record.id)).toEqual(["1"]);
  });

  it("orders results and respects pagination arguments", async () => {
    await methods.create({ model: "log", data: { id: "a", timestamp: 1 } });
    await methods.create({ model: "log", data: { id: "b", timestamp: 3 } });
    await methods.create({ model: "log", data: { id: "c", timestamp: 2 } });

    const results = (await methods.findMany({
      model: "log",
      sortBy: [{ field: "timestamp", direction: "desc" }],
      offset: 1,
      limit: 1,
    })) as Array<Record<string, unknown>>;

    expect(results).toEqual([{ id: "c", timestamp: 2 }]);
  });

  it("updates, counts, and deletes records", async () => {
    await methods.create({ model: "task", data: { id: "1", done: false } });
    await methods.create({ model: "task", data: { id: "2", done: false } });

    await methods.update({
      model: "task",
      where: [{ field: "id", value: "1" }],
      update: { done: true },
    });

    const updated = await methods.findOne({
      model: "task",
      where: [{ field: "id", value: "1" }],
    });
    expect(updated).toMatchObject({ done: true });

    const updatedCount = await methods.updateMany({
      model: "task",
      where: [{ field: "done", value: false }],
      update: { done: true },
    });
    expect(updatedCount).toBe(1);

    const total = await methods.count({
      model: "task",
      where: [{ field: "done", value: true }],
    });
    expect(total).toBe(2);

    const deleted = await methods.delete({
      model: "task",
      where: [{ field: "id", value: "1" }],
    });
    expect(deleted).toMatchObject({ id: "1" });

    const deleteCount = await methods.deleteMany({
      model: "task",
      where: [{ field: "done", value: true }],
    });
    expect(deleteCount).toBe(1);
  });

  it("upserts records using equality filters", async () => {
    await methods.upsert({
      model: "note",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", title: "initial" },
      update: { title: "initial" },
    });

    const created = await methods.findOne({
      model: "note",
      where: [{ field: "id", value: "1" }],
    });
    expect(created).toMatchObject({ title: "initial" });

    await methods.upsert({
      model: "note",
      where: [{ field: "id", value: "1" }],
      create: { id: "1", title: "ignored" },
      update: { title: "updated" },
    });

    const updated = await methods.findOne({
      model: "note",
      where: [{ field: "id", value: "1" }],
    });
    expect(updated).toMatchObject({ title: "updated" });
  });

  it("applies default values defined via field attributes", async () => {
    const adapterWithDefaults = memoryAdapter({
      generateId: () => "generated",
    });
    const contextWithDefaults = {
      ...baseAdapterContext,
      getFieldAttributes: (model: string, field: string) => {
        if (model === "task" && field === "__fields__") {
          return { status: true };
        }
        if (model === "task" && field === "status") {
          return { defaultValue: "pending" };
        }
        return {};
      },
    };
    const defaultMethods = adapterWithDefaults.initialize(contextWithDefaults);
    const created = (await defaultMethods.create({
      model: "task",
      data: { id: "task-1" },
    })) as Record<string, unknown>;
    expect(created).toMatchObject({ status: "pending" });
  });
});
