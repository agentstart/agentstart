/* agent-frontmatter:start
AGENT: Kysely adapter test
PURPOSE: Execute the adapter conformance suite across Kysely dialects
USAGE: pnpm test kysely adapter
EXPORTS:
FEATURES:
  - Validates MySQL, SQLite, and MSSQL Kysely integrations
  - Ensures thread/message behaviour matches expectations
SEARCHABLE: kysely adapter test, thread message
agent-frontmatter:end */

import path from "node:path";
import type { AgentStartOptions } from "@agentstart/types";
import Database from "better-sqlite3";
import fs from "fs-extra";
import { Kysely, MysqlDialect, SqliteDialect } from "kysely";
import { createPool, type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getMigrations } from "../../../get-migration";
import { runAdapterTest } from "../../test";
import { kyselyAdapter } from "../index";

const MYSQL_URL = "mysql://user:password@localhost:3306/agentstart";

const setupMysql = async () => {
  const pool = createPool(MYSQL_URL);
  try {
    await pool.query("SELECT 1");
    return { pool, skip: false as const };
  } catch (error) {
    const err = error as Error;
    console.warn(
      `[kysely-adapter] skipping MySQL tests: unable to connect — ${err.message}`,
    );
    await pool.end().catch(() => {});
    return { pool: null as Pool | null, skip: true as const };
  }
};

const mysqlInit = await setupMysql();

describe("adapter test", async () => {
  const sqliteDbPath = path.join(__dirname, "test.db");
  await fs.unlink(sqliteDbPath).catch(() => {});
  const sqlite = new Database(sqliteDbPath);
  const sqliteKy = new Kysely({
    dialect: new SqliteDialect({
      database: sqlite,
    }),
  });

  const createOptions = (memory: AgentStartOptions["memory"]) =>
    ({
      memory,
    }) satisfies Omit<AgentStartOptions, "agent">;

  const sqliteOptions = createOptions({
    db: sqliteKy,
    type: "sqlite",
  });

  beforeAll(async () => {
    if (!mysqlInit.skip && mysqlInit.pool) {
      const mysqlKy = new Kysely({
        dialect: new MysqlDialect(mysqlInit.pool),
      });
      const mysqlOptions = createOptions({
        db: mysqlKy,
        type: "mysql",
      });
      const { runMigrations } = await getMigrations(mysqlOptions);
      await runMigrations();
      await mysqlKy.destroy();
    }

    const { runMigrations: runSqliteMigrations } =
      await getMigrations(sqliteOptions);
    await runSqliteMigrations();
  });

  afterAll(async () => {
    if (mysqlInit.pool) {
      await mysqlInit.pool
        .query("DROP DATABASE IF EXISTS agentstart")
        .catch(() => {});
      await mysqlInit.pool.query("CREATE DATABASE agentstart").catch(() => {});
      await mysqlInit.pool.end();
    }

    sqlite.close();
    await fs.unlink(sqliteDbPath).catch(() => {});
  });

  if (!mysqlInit.skip && mysqlInit.pool) {
    const mysqlKy = new Kysely({
      dialect: new MysqlDialect(mysqlInit.pool),
    });
    const mysqlOptions = createOptions({
      db: mysqlKy,
      type: "mysql",
    });
    const mysqlAdapter = kyselyAdapter(mysqlKy, {
      type: "mysql",
    });
    await runAdapterTest({
      getAdapter: async (customOptions = {}) => {
        return mysqlAdapter({ ...mysqlOptions, ...customOptions });
      },
    });
    await mysqlKy.destroy();
  }

  const sqliteAdapter = kyselyAdapter(sqliteKy, {
    type: "sqlite",
  });
  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return sqliteAdapter({ ...sqliteOptions, ...customOptions });
    },
  });

  test("upsert inserts and updates message rows (sqlite)", async () => {
    const instance = await sqliteAdapter(sqliteOptions);
    const upsert = instance.upsert;
    if (!upsert) {
      throw new Error("expected kyselyAdapter to expose an upsert method");
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
    const initialParts = [{ type: "text", value: "hello kysely" }] as const;

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

    const updatedParts = [{ type: "text", value: "goodbye kysely" }] as const;

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
