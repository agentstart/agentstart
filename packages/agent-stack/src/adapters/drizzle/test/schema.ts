/* agent-frontmatter:start
AGENT: Drizzle Postgres test schema
PURPOSE: Define project/chat/message tables for adapter integration tests
USAGE: Imported by adapter.drizzle.test.ts
EXPORTS: project, chat, message
FEATURES:
  - Mirrors Agent Stack domain models for Postgres-backed tests
SEARCHABLE: drizzle schema, postgres test schema, project chat message
agent-frontmatter:end */

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  authorId: text("authorId").notNull(),
  title: text("title").notNull(),
  emoji: text("emoji"),
  visibility: text("visibility").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const chat = pgTable("chat", {
  id: text("id").primaryKey(),
  projectId: text("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  userId: text("userId").notNull(),
  visibility: text("visibility").notNull(),
  lastContext: jsonb("lastContext"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  chatId: text("chatId")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});
