import { describe, expect, it, vi } from "vitest";

import { type PrismaClientLike, prismaAdapter } from "../prisma";

const baseContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;

describe("prismaAdapter", () => {
  it("normalizes create/find/update calls", async () => {
    const delegate = {
      create: vi.fn(async (args) => ({ ...args.data, id: "created" })),
      findFirst: vi.fn(async () => ({ id: "found" })),
      findMany: vi.fn(async () => [{ id: "listed" }]),
      count: vi.fn(async () => 2),
      update: vi.fn(async (args) => ({ ...args.data, id: "updated" })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      delete: vi.fn(async () => ({ id: "removed" })),
      deleteMany: vi.fn(async () => ({ count: 4 })),
    } as const;

    const prisma: PrismaClientLike = {
      account: delegate,
      $transaction: vi.fn(async (callback) =>
        callback({ account: delegate } as unknown as PrismaClientLike),
      ),
    };

    const adapter = prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
      camelCase: true,
    });

    const methods = adapter.initialize({ ...baseContext });

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

    const txnResult = await methods.transaction?.(async (adapterMethods) => {
      await adapterMethods.count({ model: "account" });
      return "done";
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(txnResult).toBe("done");
  });
});
