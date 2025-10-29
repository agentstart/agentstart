/* agent-frontmatter:start
AGENT: Prisma adapter test
PURPOSE: Run the adapter conformance suite against Prisma client
USAGE: pnpm test prisma adapter
EXPORTS:
FEATURES:
  - Executes shared adapter tests using Prisma + sqlite provider
SEARCHABLE: prisma adapter test, thread message
agent-frontmatter:end */

import { PrismaClient } from "@prisma/client";
import { beforeAll, describe, expect, test } from "vitest";
import { runAdapterTest } from "../../test";
import { prismaAdapter } from "../prisma-adapter";

const db = new PrismaClient();
describe("adapter test", async () => {
  beforeAll(async () => {
    await clearDb();
  });
  const adapter = prismaAdapter(db, {
    provider: "sqlite",
  });

  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({
        ...customOptions,
      });
    },
  });

  test("upsert inserts and updates message rows (prisma)", async () => {
    const instance = await adapter({});
    const upsert = instance.upsert;
    if (!upsert) {
      throw new Error("expected prismaAdapter to expose an upsert method");
    }

    const timestamp = new Date();
    const thread = await instance.create({
      model: "thread",
      data: {
        id: `thread-upsert-${Date.now()}`,
        title: "Upsert Thread",
        userId: "user-upsert",
        visibility: "private",
        lastContext: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    });

    const messageId = `msg-upsert-${Date.now()}`;
    const initialParts = [{ type: "text", value: "hello prisma" }] as const;

    await upsert({
      model: "message",
      where: [
        {
          field: "id",
          value: messageId,
        },
      ],
      create: {
        id: messageId,
        threadId: thread.id,
        role: "assistant",
        attachments: [],
        createdAt: new Date(),
      },
      update: {
        parts: initialParts,
        updatedAt: new Date(),
      },
    });

    const created = await instance.findOne<{
      id: string;
      parts: Array<Record<string, unknown>>;
    }>({
      model: "message",
      where: [
        {
          field: "id",
          value: messageId,
        },
      ],
    });

    expect(created?.id).toBe(messageId);
    expect(created?.parts).toEqual(initialParts);

    const updatedParts = [{ type: "text", value: "goodbye prisma" }] as const;

    await upsert({
      model: "message",
      where: [
        {
          field: "id",
          value: messageId,
        },
      ],
      create: {
        id: messageId,
        threadId: thread.id,
        role: "assistant",
        attachments: [],
        createdAt: new Date(),
      },
      update: {
        parts: updatedParts,
        updatedAt: new Date(),
      },
    });

    const updated = await instance.findOne<{
      id: string;
      parts: Array<Record<string, unknown>>;
    }>({
      model: "message",
      where: [
        {
          field: "id",
          value: messageId,
        },
      ],
    });

    expect(updated?.parts).toEqual(updatedParts);
  });
});

async function clearDb() {
  const prismaDb = db as unknown as {
    message: { deleteMany: () => Promise<unknown> };
    thread: { deleteMany: () => Promise<unknown> };
  };

  await prismaDb.message.deleteMany();
  await prismaDb.thread.deleteMany();
}
