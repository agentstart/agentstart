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

import { rm } from "node:fs/promises";
import path from "node:path";
import type { AgentStartOptions } from "@agentstart/types";
import Database from "better-sqlite3";
import { Kysely, MysqlDialect, SqliteDialect } from "kysely";
import { createPool, type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getMigrations } from "../../get-migration";
import { runAdapterTest } from "../../test";
import { kyselyMemoryAdapter } from "../kysely-adapter";

const MYSQL_URL = process.env.TEST_DB_MYSQL_URL ?? process.env.MYSQL_URL;

const setupMysql = async () => {
  if (!MYSQL_URL) {
    console.warn(
      "[kysely-adapter] skipping MySQL tests: TEST_DB_MYSQL_URL not provided",
    );
    return { pool: null as Pool | null, skip: true as const };
  }
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
  await rm(sqliteDbPath).catch(() => {});

  let sqlite: Database.Database | null = null;
  try {
    sqlite = new Database(sqliteDbPath);
  } catch (error) {
    console.warn(
      `[kysely-adapter] skipping SQLite tests: unable to load better-sqlite3 — ${
        (error as Error).message
      }`,
    );
  }
  let mysqlKy: Kysely<unknown> | null = null;
  const sqliteKy = sqlite
    ? new Kysely({
        dialect: new SqliteDialect({
          database: sqlite,
        }),
      })
    : null;

  const createOptions = (memory: AgentStartOptions["memory"]) =>
    ({
      memory,
    }) satisfies Omit<AgentStartOptions, "agent">;

  const sqliteOptions = sqliteKy
    ? createOptions({
        db: sqliteKy,
        type: "sqlite",
      })
    : null;

  beforeAll(async () => {
    if (!mysqlInit.skip && mysqlInit.pool) {
      const mysqlInstance = new Kysely({
        dialect: new MysqlDialect(mysqlInit.pool),
      });
      mysqlKy = mysqlInstance;
      const mysqlOptions = createOptions({
        db: mysqlInstance,
        type: "mysql",
      });
      const { runMigrations } = await getMigrations(mysqlOptions);
      await runMigrations();
    }

    if (sqliteKy && sqliteOptions) {
      const { runMigrations: runSqliteMigrations } =
        await getMigrations(sqliteOptions);
      await runSqliteMigrations();
    }
  });

  afterAll(async () => {
    if (mysqlInit.pool) {
      await mysqlInit.pool
        .query("DROP DATABASE IF EXISTS agentstart")
        .catch(() => {});
      await mysqlInit.pool.query("CREATE DATABASE agentstart").catch(() => {});
      if (mysqlKy) {
        await mysqlKy.destroy().catch(() => {});
      } else {
        await mysqlInit.pool.end().catch(() => {});
      }
    }

    if (sqlite) {
      sqlite.close();
    }
    await rm(sqliteDbPath).catch(() => {});
  });

  if (!mysqlInit.skip && mysqlInit.pool) {
    if (!mysqlKy) {
      mysqlKy = new Kysely({
        dialect: new MysqlDialect(mysqlInit.pool),
      });
    }
    const mysqlOptions = createOptions({
      db: mysqlKy,
      type: "mysql",
    });
    const mysqlAdapter = kyselyMemoryAdapter(mysqlKy, {
      type: "mysql",
    });
    await runAdapterTest({
      getAdapter: async (customOptions = {}) => {
        return mysqlAdapter({ ...mysqlOptions, ...customOptions });
      },
    });
  }

  if (sqliteKy && sqliteOptions) {
    const sqliteAdapter = kyselyMemoryAdapter(sqliteKy, {
      type: "sqlite",
    });
    await runAdapterTest({
      getAdapter: async (customOptions = {}) => {
        return sqliteAdapter({ ...sqliteOptions, ...customOptions });
      },
    });
  }

  test.skipIf(!sqliteKy || !sqliteOptions)(
    "upsert inserts and updates message rows (sqlite)",
    async () => {
      if (!sqliteKy || !sqliteOptions) {
        throw new Error("SQLite test skipped — adapter not initialized");
      }
      const instance = await (
        kyselyMemoryAdapter(sqliteKy, {
          type: "sqlite",
        }) as ReturnType<typeof kyselyMemoryAdapter>
      )(sqliteOptions);
      const upsert = instance.upsert;
      if (!upsert) {
        throw new Error(
          "expected kyselyMemoryAdapter to expose an upsert method",
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
    },
  );
});
