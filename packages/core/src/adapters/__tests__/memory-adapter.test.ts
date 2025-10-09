import { beforeEach, describe, expect, it } from "vitest";

import { memoryAdapter } from "../memory";

const baseContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;

describe("memoryAdapter", () => {
  const adapter = memoryAdapter({ generateId: () => "generated-id" });
  const methods = adapter.initialize({ ...baseContext });

  beforeEach(async () => {
    // Recreate the adapter to reset state between tests.
    const fresh = memoryAdapter({ generateId: () => "generated-id" });
    Object.assign(methods, fresh.initialize({ ...baseContext }));
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
});
