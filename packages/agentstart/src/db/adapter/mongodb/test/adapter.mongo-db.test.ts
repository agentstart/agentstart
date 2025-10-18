/* agent-frontmatter:start
AGENT: MongoDB adapter test
PURPOSE: Run the adapter conformance suite against the MongoDB adapter
USAGE: pnpm test mongodb adapter
EXPORTS:
FEATURES:
  - Executes shared adapter suite with MongoDB storage
  - Ensures thread/message behaviour matches expectations
SEARCHABLE: mongodb adapter test, thread message
agent-frontmatter:end */

import { type Db, MongoClient } from "mongodb";
import { beforeAll, describe, expect, test } from "vitest";
import { mongodbAdapter } from "@/db/adapter/mongodb";
import { runAdapterTest } from "@/db/adapter/test";

const createDb = async (connectionString: string, dbName: string) => {
  const client = new MongoClient(connectionString);
  await client.connect();
  return client.db(dbName);
};

const connection = await (async () => {
  try {
    const db = await createDb("mongodb://127.0.0.1:27017", "agentstart-tests");
    return { db, skip: false as const };
  } catch (error) {
    const err = error as Error;
    console.warn(
      `[mongodb-adapter] skipping tests: unable to connect to MongoDB — ${err.message}`,
    );
    return { db: null as Db | null, skip: true as const };
  }
})();

const describeFn = connection.skip ? describe.skip : describe;

describeFn("adapter test", async () => {
  const database = connection.db;
  if (!database) {
    return;
  }
  const db: Db = database;

  async function clearDb() {
    await db.collection("thread").deleteMany({});
    await db.collection("message").deleteMany({});
  }

  beforeAll(async () => {
    await clearDb();
  });

  const adapter = mongodbAdapter(db);
  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({
        ...customOptions,
      });
    },
    skipGenerateIdTest: true,
  });

  test("upsert inserts and updates message documents", async () => {
    const instance = await adapter({});
    const upsert = instance.upsert;
    if (!upsert) {
      throw new Error("expected mongodbAdapter to expose an upsert method");
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
    const initialParts = [{ type: "text", value: "hello world" }] as const;

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

    const updatedParts = [{ type: "text", value: "goodbye world" }] as const;

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
