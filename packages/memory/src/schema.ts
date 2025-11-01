/* agent-frontmatter:start
AGENT: Database schema definitions
PURPOSE: Define Agent Start domain schemas with Zod for validation and typing
USAGE: import { threadSchema } from "agentstart/memory/schema"
EXPORTS: threadSchema, messageSchema, todoPayloadSchema, todoSchema, DBThread, DBMessage, DBTodo
FEATURES:
  - Zod-based schema definitions for thread, message, and todo entities
  - Provides inferred TypeScript types for database adapters
  - Acts as the single source of truth for domain field constraints
SEARCHABLE: database schema, thread schema, message schema, todo schema, todo payload, zod
agent-frontmatter:end */

import { z } from "zod";

export const threadSchema = z.object({
  id: z.string(),
  title: z.string(),
  userId: z.string(),
  visibility: z.enum(["public", "private"]).default("private"),
  lastContext: z.any().nullish(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBThread = z.infer<typeof threadSchema>;

export const messageSchema = z.object({
  id: z.string(),
  threadId: z.string().describe("The ID of the thread this message belongs to"),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.any(),
  attachments: z.any().optional(),
  metadata: z.any().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBMessage = z.infer<typeof messageSchema>;

export const todoPayloadSchema = z.array(
  z.object({
    id: z.string(),
    content: z.string(),
    status: z.enum(["pending", "inProgress", "completed", "cancelled"]),
    priority: z.enum(["high", "medium", "low"]),
  }),
);

export const todoSchema = z.object({
  id: z.string(),
  threadId: z.string().describe("The ID of the thread this todo belongs to"),
  todos: todoPayloadSchema.describe(
    "Serialized todo collection for the thread",
  ),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBTodo = z.infer<typeof todoSchema>;
