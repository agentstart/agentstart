/* agent-frontmatter:start
AGENT: Playground database schema
PURPOSE: Defines thread, message, and todo tables for the sample application.
USAGE: Used by Drizzle to generate queries and migrations.
EXPORTS: thread, message, todo
FEATURES:
  - Configures foreign keys and cascade behavior
  - Captures timestamps and metadata columns for agent data
SEARCHABLE: playground, next, src, db, schema, agent, drizzle
agent-frontmatter:end */

import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const thread = pgTable("thread", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  visibility: text("visibility").notNull(),
  lastContext: text("last_context"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: text("parts").notNull(),
  attachments: text("attachments"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const todo = pgTable("todo", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  todos: text("todos").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
