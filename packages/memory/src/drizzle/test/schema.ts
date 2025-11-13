/* agent-frontmatter:start
AGENT: Drizzle Postgres test schema
PURPOSE: Define thread/message tables for adapter integration tests
USAGE: Imported by adapter.drizzle.test.ts
EXPORTS: thread, message
FEATURES:
  - Mirrors Agent Start domain models for Postgres-backed tests
SEARCHABLE: drizzle schema, postgres test schema, thread message
agent-frontmatter:end */

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const thread = pgTable("thread", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("userId").notNull(),
  visibility: text("visibility").notNull(),
  lastContext: jsonb("lastContext"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  threadId: text("threadId")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const todo = pgTable("todo", {
  id: text("id").primaryKey(),
  threadId: text("threadId")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  todos: jsonb("todos").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});
