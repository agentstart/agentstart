/* agent-frontmatter:start
AGENT: Adapter type definitions
PURPOSE: Supply shared TypeScript types for database adapters and utilities
USAGE: import type { Adapter, AgentStackOptions } from "agent-stack/types"
EXPORTS: Adapter, AdapterInstance, AgentStackOptions, SecondaryStorage, User, Thread, Account, Verification, Where
FEATURES:
  - Defines the adapter contract consumed by Agent Stack adapters
  - Provides a pared-down AgentStackOptions without plugin hooks
  - Includes shared record models used in adapter tests
SEARCHABLE: adapter types, agent stack options, database models
agent-frontmatter:end */

import type { Database } from "better-sqlite3";
import type { Dialect, Kysely } from "kysely";
import type { Agent } from "./agent";
import type { FieldAttribute } from "./field";
import type { KyselyDatabaseType } from "./kysely";

export type Where = {
  operator?:
    | "eq"
    | "ne"
    | "lt"
    | "lte"
    | "gt"
    | "gte"
    | "in"
    | "contains"
    | "starts_with"
    | "ends_with";
  value: string | number | boolean | string[] | number[] | Date | null;
  field: string;
  connector?: "AND" | "OR";
};

export type Adapter = {
  id: string;
  create: <T extends Record<string, unknown>, R = T & { id: string }>(data: {
    model: string;
    data: T;
    select?: string[];
  }) => Promise<R>;
  findOne: <T>(data: {
    model: string;
    where: Where[];
    select?: string[];
  }) => Promise<T | null>;
  findMany: <T>(data: {
    model: string;
    where?: Where[];
    limit?: number;
    sortBy?: { field: string; direction: "asc" | "desc" };
    offset?: number;
  }) => Promise<T[]>;
  count: (data: { model: string; where?: Where[] }) => Promise<number>;
  update: <T>(data: {
    model: string;
    where: Where[];
    update: Record<string, unknown>;
  }) => Promise<T | null>;
  updateMany: (data: {
    model: string;
    where: Where[];
    update: Record<string, unknown>;
  }) => Promise<number>;
  delete: (data: { model: string; where: Where[] }) => Promise<void>;
  deleteMany: (data: { model: string; where: Where[] }) => Promise<number>;
  upsert?: <T>(data: {
    model: string;
    where: Where[];
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }) => Promise<T | null>;
  createSchema?: (
    options: AgentStackOptions,
    file?: string,
  ) => Promise<AdapterSchemaCreation>;
  options?: unknown;
};

export type AdapterSchemaCreation = {
  code: string;
  path: string;
  append?: boolean;
  overwrite?: boolean;
};

export type AdapterInstance = (options: AgentStackOptions) => Adapter;

export interface SecondaryMemory {
  get: (key: string) => Promise<string | null> | string | null;
  set: (
    key: string,
    value: string,
    ttl?: number,
  ) => Promise<undefined | string | null> | undefined;
  delete: (key: string) => Promise<undefined | string | null> | undefined;
}

type SqlitePoolLike = { prepare: (...args: unknown[]) => unknown };
type MysqlPoolLike = { getConnection: (...args: unknown[]) => unknown };
type PostgresPoolLike = { connect: (...args: unknown[]) => unknown };
type DialectLike = { createDriver: (...args: unknown[]) => unknown };

export type ModelFieldOverrides = Partial<Record<string, string>>;

export type ModelOptions = {
  modelName?: string;
  fields?: ModelFieldOverrides;
  additionalFields?: Record<string, FieldAttribute>;
};

export type Memory =
  | AdapterInstance
  | Dialect
  | DialectLike
  | SqlitePoolLike
  | Database
  | MysqlPoolLike
  | PostgresPoolLike
  | {
      dialect: Dialect;
      type: KyselyDatabaseType;
      casing?: "snake" | "camel";
    }
  | {
      db: Kysely<unknown>;
      type: KyselyDatabaseType;
      casing?: "snake" | "camel";
    };

export type AgentStackOptions = {
  appName?: string;
  baseURL?: string;
  basePath?: `/${string}`;
  memory?: Memory;
  secondaryMemory?: SecondaryMemory;
  agent: Agent;
  getUserId?: (headers: Headers) => string | Promise<string>;
  advanced?: {
    generateId?:
      | false
      | ((options: { model: string; size?: number }) => string);
  };
  thread?: ModelOptions;
  message?: ModelOptions;
};
