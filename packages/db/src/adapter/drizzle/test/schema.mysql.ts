/* agent-frontmatter:start
AGENT: Drizzle MySQL test schema
PURPOSE: Define thread/message tables for adapter integration tests
USAGE: Imported by adapter.drizzle.mysql.test.ts
EXPORTS: thread, message
FEATURES:
  - Mirrors Agent Start domain models for MySQL-backed tests
SEARCHABLE: drizzle schema, mysql test schema, thread message
agent-frontmatter:end */

import { datetime, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const thread = mysqlTable("thread", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 255 }).notNull(),
  visibility: varchar("visibility", { length: 32 }).notNull(),
  lastContext: json("lastContext"),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const message = mysqlTable("message", {
  id: varchar("id", { length: 255 }).primaryKey(),
  threadId: varchar("threadId", { length: 255 })
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 64 }).notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments"),
  metadata: json("metadata"),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const todo = mysqlTable("todo", {
  id: varchar("id", { length: 255 }).primaryKey(),
  threadId: varchar("threadId", { length: 255 })
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  todos: json("todos").notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});
