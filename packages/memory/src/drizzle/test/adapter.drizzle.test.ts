/* agent-frontmatter:start
AGENT: Drizzle adapter Postgres test
PURPOSE: Run the adapter conformance suite on Postgres via Drizzle
USAGE: pnpm test drizzle postgres
EXPORTS:
FEATURES:
  - Applies generated migrations before running adapter tests
  - Verifies thread/message behaviour across Postgres
SEARCHABLE: drizzle postgres test, thread message
agent-frontmatter:end */

import type { AgentStartOptions } from "@agentstart/types";
import { drizzle } from "drizzle-orm/node-postgres";
import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { afterAll, describe, expect, test } from "vitest";
import { getMigrations } from "../../get-migration";
import { runAdapterTest } from "../../test";
import { drizzleMemoryAdapter } from "../drizzle-adapter";
import * as schema from "./schema";

const TEST_DB_URL = "postgres://user:password@localhost:5432/agentstart";

const createTestPool = () => new Pool({ connectionString: TEST_DB_URL });

const createKyselyInstance = (pool: Pool) =>
  new Kysely({
    dialect: new PostgresDialect({ pool }),
  });

const cleanupDatabase = async (postgres: Kysely<unknown>) => {
  await sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`.execute(
    postgres,
  );
  await postgres.destroy();
};

const createTestOptions = (pg: Pool): Omit<AgentStartOptions, "agent"> => ({
  memory: pg,
});

const connection = await (async () => {
  const pool = createTestPool();
  try {
    await pool.query("SELECT 1");
    return { pool, skip: false as const };
  } catch (error) {
    const err = error as Error;
    console.warn(
      `[drizzle-adapter] skipping Postgres tests: unable to connect — ${err.message}`,
    );
    await pool.end().catch(() => {});
    return { pool: null as Pool | null, skip: true as const };
  }
})();

const describeFn = connection.skip ? describe.skip : describe;

describeFn("Drizzle Adapter Tests", async () => {
  const pg = connection.pool;
  if (!pg) {
    return;
  }

  const postgres = createKyselyInstance(pg);
  const opts = createTestOptions(pg);
  const { runMigrations } = await getMigrations(opts);
  await runMigrations();

  afterAll(async () => {
    await cleanupDatabase(postgres);
  });
  const db = drizzle(pg);
  const adapter = drizzleMemoryAdapter(db, { provider: "postgresql", schema });

  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({ ...opts, ...customOptions });
    },
  });

  test("upsert inserts and updates message rows", async () => {
    const instance = await adapter(opts);
    const upsert = instance.upsert;
    if (!upsert) {
      throw new Error(
        "expected drizzleMemoryAdapter to expose an upsert method",
      );
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
    const initialParts = [{ type: "text", value: "hello drizzle" }] as const;

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

    const updatedParts = [{ type: "text", value: "goodbye drizzle" }] as const;

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
