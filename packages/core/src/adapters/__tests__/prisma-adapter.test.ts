import { describe, expect, it, vi } from "vitest";

import { type PrismaClientLike, prismaAdapter } from "../prisma";
import { baseAdapterContext } from "./shared/context";
import { runAdapterSuite } from "./shared/run-adapter-suite";

const defaultOptions = {
  provider: "postgresql" as const,
  transaction: true,
  camelCase: true,
};

function createDelegate() {
  return {
    create: vi.fn(async (args) => ({ ...args.data, id: "created" })),
    findFirst: vi.fn(async () => ({ id: "found" })),
    findMany: vi.fn(async () => [{ id: "listed" }]),
    count: vi.fn(async () => 2),
    update: vi.fn(async (args) => ({ ...args.data, id: "updated" })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    delete: vi.fn(async () => ({ id: "removed" })),
    deleteMany: vi.fn(async () => ({ count: 4 })),
    upsert: vi.fn(async (args) => ({
      ...args.update,
      id: "upserted",
    })),
  } as const;
}

function buildPrismaInstance(overrides?: {
  getFieldAttributes?: (
    model: string,
    field: string,
  ) => Record<string, unknown>;
}) {
  const delegate = createDelegate();
  const prisma: PrismaClientLike = {
    account: delegate,
    $transaction: vi.fn(async (callback) =>
      callback({ account: delegate } as unknown as PrismaClientLike),
    ),
  };
  const adapter = prismaAdapter(prisma, defaultOptions);
  const context = {
    ...baseAdapterContext,
    ...(overrides?.getFieldAttributes
      ? { getFieldAttributes: overrides.getFieldAttributes }
      : {}),
  };
  const methods = adapter.initialize(context);
  return { methods, delegate, prisma };
}

runAdapterSuite({
  name: "prismaAdapter",
  createAdapter: () => buildPrismaInstance().methods,
  scenario: {
    create: {
      model: "account",
      data: { status: "active" },
      select: ["createdAt"],
    },
    findOne: {
      model: "account",
      where: [{ field: "status", value: "active" }],
      select: ["createdAt"],
    },
    findMany: {
      model: "account",
      where: [
        { field: "status", value: "active" },
        { field: "tags", value: ["beta"], operator: "in", connector: "OR" },
      ],
      sortBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
      offset: 2,
    },
    count: {
      model: "account",
      where: [{ field: "status", value: "active" }],
    },
    update: {
      model: "account",
      where: [{ field: "id", value: "created" }],
      update: { status: "inactive" },
    },
    updateMany: {
      model: "account",
      where: [{ field: "status", value: "inactive" }],
      update: { status: "active" },
    },
    delete: {
      model: "account",
      where: [{ field: "id", value: "created" }],
      select: ["status"],
    },
    deleteMany: {
      model: "account",
      where: [{ field: "status", value: "inactive" }],
    },
    upsert: {
      model: "account",
      where: [{ field: "id", value: "created" }],
      create: { status: "pending" },
      update: { status: "retained" },
      select: ["status"],
    },
  },
  assertions: {
    create: (record) => expect(record).toMatchObject({ id: "created" }),
    findOne: (record) => expect(record).toEqual({ id: "found" }),
    findMany: (records) => expect(records).toEqual([{ id: "listed" }]),
    count: (value) => expect(value).toBe(2),
    update: (record) =>
      expect(record).toEqual({ status: "inactive", id: "updated" }),
    updateMany: (value) => expect(value).toBe(1),
    delete: (record) => expect(record).toEqual({ id: "removed" }),
    deleteMany: (value) => expect(value).toBe(4),
    upsert: (record) =>
      expect(record).toEqual({ status: "retained", id: "upserted" }),
  },
});

describe("prismaAdapter", () => {
  it("normalizes create/find/update calls", async () => {
    const { methods, delegate, prisma } = buildPrismaInstance();

    const created = await methods.create({
      model: "account",
      data: { status: "active" },
      select: ["createdAt"],
    });
    expect(created).toEqual({ status: "active", id: "created" });
    expect(delegate.create).toHaveBeenCalledWith({
      data: { status: "active" },
      select: { created_at: true },
    });

    const found = await methods.findOne({
      model: "account",
      where: [{ field: "status", value: "active" }],
      select: ["createdAt"],
    });
    expect(found).toEqual({ id: "found" });
    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: { status: "active" },
      select: { created_at: true },
    });

    const listed = await methods.findMany({
      model: "account",
      where: [
        { field: "status", value: "active" },
        { field: "tags", value: ["beta"], operator: "in", connector: "OR" },
      ],
      sortBy: [{ field: "createdAt", direction: "desc" }],
      limit: 5,
      offset: 2,
    });
    expect(listed).toEqual([{ id: "listed" }]);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {
        AND: [{ status: "active" }],
        OR: [{ tags: { in: ["beta"] } }],
      },
      orderBy: { created_at: "desc" },
      take: 5,
      skip: 2,
    });

    const counted = await methods.count({
      model: "account",
      where: [{ field: "status", value: "active" }],
    });
    expect(counted).toBe(2);
    expect(delegate.count).toHaveBeenCalledWith({
      where: { status: "active" },
    });

    const updated = await methods.update({
      model: "account",
      where: [{ field: "id", value: "created" }],
      update: { status: "inactive" },
    });
    expect(updated).toEqual({ status: "inactive", id: "updated" });
    expect(delegate.update).toHaveBeenCalledWith({
      where: { id: "created" },
      data: { status: "inactive" },
      select: undefined,
    });

    const updatedMany = await methods.updateMany({
      model: "account",
      where: [{ field: "status", value: "inactive" }],
      update: { status: "active" },
    });
    expect(updatedMany).toBe(1);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: { status: "inactive" },
      data: { status: "active" },
    });

    const removed = await methods.delete({
      model: "account",
      where: [{ field: "id", value: "created" }],
      select: ["status"],
    });
    expect(removed).toEqual({ id: "removed" });
    expect(delegate.delete).toHaveBeenCalledWith({
      where: { id: "created" },
      select: { status: true },
    });

    const deletedMany = await methods.deleteMany({
      model: "account",
      where: [{ field: "status", value: "inactive" }],
    });
    expect(deletedMany).toBe(4);
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { status: "inactive" },
    });

    const upserted = await methods.upsert({
      model: "account",
      where: [{ field: "id", value: "created" }],
      create: { status: "pending" },
      update: { status: "retained" },
      select: ["status"],
    });
    expect(upserted).toEqual({ status: "retained", id: "upserted" });
    expect(delegate.upsert).toHaveBeenCalledWith({
      where: { id: "created" },
      create: { status: "pending" },
      update: { status: "retained" },
      select: { status: true },
    });

    const txnResult = await methods.transaction?.(async (adapterMethods) => {
      await adapterMethods.count({ model: "account" });
      return "done";
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(txnResult).toBe("done");
  });

  it("applies default values defined on fields when creating records", async () => {
    const defaults = (model: string, field: string) => {
      if (model === "account" && field === "__fields__") {
        return { status: true };
      }
      if (model === "account" && field === "status") {
        return { defaultValue: "pending" };
      }
      return {};
    };
    const { methods: defaultMethods, delegate: defaultDelegate } =
      buildPrismaInstance({ getFieldAttributes: defaults });

    await defaultMethods.create({
      model: "account",
      data: { email: "default@example.com" },
    });

    expect(defaultDelegate.create).toHaveBeenLastCalledWith({
      data: { email: "default@example.com", status: "pending" },
      select: undefined,
    });
  });
});
