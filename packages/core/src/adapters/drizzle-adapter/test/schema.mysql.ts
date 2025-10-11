/* agent-frontmatter:start
AGENT: Drizzle MySQL test schema
PURPOSE: Define project/chat/message tables for adapter integration tests
USAGE: Imported by adapter.drizzle.mysql.test.ts
EXPORTS: project, chat, message
FEATURES:
  - Mirrors Agent Stack domain models for MySQL-backed tests
SEARCHABLE: drizzle schema, mysql test schema, project chat message
agent-frontmatter:end */

import {
  datetime,
  json,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const project = mysqlTable("project", {
  id: varchar("id", { length: 255 }).primaryKey(),
  authorId: varchar("authorId", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  emoji: text("emoji"),
  visibility: varchar("visibility", { length: 32 }).notNull(),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const chat = mysqlTable("chat", {
  id: varchar("id", { length: 255 }).primaryKey(),
  projectId: varchar("projectId", { length: 255 })
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 255 }).notNull(),
  visibility: varchar("visibility", { length: 32 }).notNull(),
  lastContext: json("lastContext"),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});

export const message = mysqlTable("message", {
  id: varchar("id", { length: 255 }).primaryKey(),
  chatId: varchar("chatId", { length: 255 })
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 64 }).notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments"),
  createdAt: datetime("createdAt", { mode: "date" }).notNull(),
  updatedAt: datetime("updatedAt", { mode: "date" }).notNull(),
});
