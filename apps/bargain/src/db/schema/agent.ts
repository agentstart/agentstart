import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const thread = pgTable("thread", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").notNull(),
  visibility: text("visibility").notNull(),
  lastContext: jsonb("last_context"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => thread.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  attachments: jsonb("attachments"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const todo = pgTable("todo", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .unique()
    .references(() => thread.id, { onDelete: "cascade" }),
  todos: jsonb("todos").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

