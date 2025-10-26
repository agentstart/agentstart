/* agent-frontmatter:start
AGENT: Drizzle adapter MySQL test
PURPOSE: Run the adapter conformance suite on MySQL via Drizzle
USAGE: pnpm test drizzle mysql
EXPORTS:
FEATURES:
  - Applies generated migrations before running adapter tests
  - Verifies thread/message behaviour across MySQL
SEARCHABLE: drizzle mysql test, thread message
agent-frontmatter:end */

import type { AgentStartOptions } from "@agentstart/types";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { afterAll, describe, expect, test } from "vitest";
import { getMigrations } from "../../../get-migration";
import { runAdapterTest } from "../../test";
import { drizzleAdapter } from "../index";
import * as schema from "./schema.mysql";

const TEST_DB_MYSQL_URL = "mysql://user:password@localhost:3306/agentstart";

const createTestPool = () => createPool(TEST_DB_MYSQL_URL);

const cleanupDatabase = async (mysql: Pool) => {
  await mysql.query("DROP DATABASE IF EXISTS agentstart");
  await mysql.query("CREATE DATABASE agentstart");
  await mysql.end();
};

const createTestOptions = (pool: Pool): Omit<AgentStartOptions, "agent"> => ({
  memory: pool,
});

const connection = await (async () => {
  const pool = createTestPool();
  try {
    await pool.query("SELECT 1");
    return { pool, skip: false as const };
  } catch (error) {
    const err = error as Error;
    console.warn(
      `[drizzle-adapter] skipping MySQL tests: unable to connect — ${err.message}`,
    );
    await pool.end().catch(() => {});
    return { pool: null as Pool | null, skip: true as const };
  }
})();

const describeFn = connection.skip ? describe.skip : describe;

describeFn("Drizzle Adapter Tests (MySQL)", async () => {
  const pool = connection.pool;
  if (!pool) {
    return;
  }

  const opts = createTestOptions(pool);
  const { runMigrations } = await getMigrations(opts);
  await runMigrations();

  afterAll(async () => {
    await cleanupDatabase(pool);
  });

  const db = drizzle({
    client: pool,
  });
  const adapter = drizzleAdapter(db, { provider: "mysql", schema });

  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({ ...opts, ...customOptions });
    },
  });

  test("upsert inserts and updates message rows (MySQL)", async () => {
    const instance = await adapter(opts);
    const upsert = instance.upsert;
    if (!upsert) {
      throw new Error("expected drizzleAdapter to expose an upsert method");
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
    const initialParts = [
      { type: "text", value: "hello drizzle mysql" },
    ] as const;

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

    const updatedParts = [
      { type: "text", value: "goodbye drizzle mysql" },
    ] as const;

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
