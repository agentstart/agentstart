/** biome-ignore-all lint/suspicious/noExplicitAny: is fine */

import {
  type Dialect,
  Kysely,
  MssqlDialect,
  MysqlDialect,
  type MysqlPool,
  PostgresDialect,
  type PostgresPool,
  type SqliteDatabase,
  SqliteDialect,
} from "kysely";
import type { AgentStackOptions, KyselyDatabaseType } from "@/types";

function getDatabaseType(
  db: AgentStackOptions["memory"],
): KyselyDatabaseType | null {
  if (!db) {
    return null;
  }
  if ("dialect" in db) {
    return getDatabaseType(db.dialect as Dialect);
  }
  if ("createDriver" in db) {
    if (db instanceof SqliteDialect) {
      return "sqlite";
    }
    if (db instanceof MysqlDialect) {
      return "mysql";
    }
    if (db instanceof PostgresDialect) {
      return "postgres";
    }
    if (db instanceof MssqlDialect) {
      return "mssql";
    }
  }
  if ("aggregate" in db) {
    return "sqlite";
  }

  if ("getConnection" in db) {
    return "mysql";
  }
  if ("connect" in db) {
    return "postgres";
  }

  return null;
}

export const createKyselyAdapter = async (
  options: Omit<AgentStackOptions, "agent">,
) => {
  const db = options.memory;

  if (!db) {
    return {
      kysely: null,
      databaseType: null,
    };
  }

  if ("db" in db) {
    return {
      kysely: db.db,
      databaseType: db.type,
    };
  }

  if ("dialect" in db) {
    return {
      kysely: new Kysely<any>({ dialect: db.dialect }),
      databaseType: db.type,
    };
  }

  let dialect: Dialect | undefined;

  const databaseType = getDatabaseType(db);

  if ("createDriver" in db) {
    dialect = db as Dialect;
  }

  if ("prepare" in db) {
    dialect = new SqliteDialect({
      database: db as SqliteDatabase,
    });
  }

  if ("getConnection" in db) {
    dialect = new MysqlDialect({ pool: db as MysqlPool });
  }

  if ("connect" in db) {
    dialect = new PostgresDialect({
      pool: db as PostgresPool,
    });
  }

  return {
    kysely: dialect ? new Kysely<any>({ dialect }) : null,
    databaseType,
  };
};
