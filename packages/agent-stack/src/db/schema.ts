/* agent-frontmatter:start
AGENT: Database schema definitions
PURPOSE: Define Agent Stack domain schemas with Zod for validation and typing
USAGE: import { projectSchema } from "agent-stack/db/schema"
EXPORTS: projectSchema, chatSchema, messageSchema, DBProject, DBChat, DBMessage
FEATURES:
  - Zod-based schema definitions for project, chat, and message entities
  - Provides inferred TypeScript types for database adapters
  - Acts as the single source of truth for domain field constraints
SEARCHABLE: database schema, project schema, chat schema, message schema, zod
agent-frontmatter:end */

import { z } from "zod";

export const projectSchema = z.object({
  id: z.string().max(255),
  authorId: z
    .string()
    .max(255)
    .describe("The ID of the user who owns this project"),
  title: z.string().default("New Project"),
  emoji: z.string().optional(),
  visibility: z.enum(["private", "public"]).default("public"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBProject = z.infer<typeof projectSchema>;

export const chatSchema = z.object({
  id: z.string(),
  projectId: z
    .string()
    .max(255)
    .describe("The ID of the project this chat belongs to"),
  title: z.string(),
  userId: z.string(),
  visibility: z.enum(["public", "private"]).default("private"),
  lastContext: z.any().nullish(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBChat = z.infer<typeof chatSchema>;

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string().describe("The ID of the chat this message belongs to"),
  role: z.string(),
  parts: z.any(),
  attachments: z.any().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBMessage = z.infer<typeof messageSchema>;
