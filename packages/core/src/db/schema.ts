/* agent-frontmatter:start
AGENT: Database schema definitions
PURPOSE: Define database schemas using Zod for validation and ORM conversion
USAGE: Import schemas for validation, type inference, and ORM adapter generation
EXPORTS: userSchema, chatSchema, messageSchema, voteSchema, documentSchema, suggestionSchema, streamSchema
FEATURES:
  - Zod-based schema definitions for type safety and validation
  - User schema with authentication fields
  - Chat schema with visibility control and context tracking
  - Message schema with parts and attachments
  - Vote schema for message voting
  - Document schema with multiple content types
  - Suggestion schema for document editing workflows
  - Stream schema for real-time chat streaming
  - Can be converted to various ORM formats (Drizzle, Prisma, MongoDB)
SEARCHABLE: database, schema, zod, validation, user, chat, message, vote, document, suggestion, stream, orm
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
  lastContext: z.any().nullish(), // AppUsage type
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBChat = z.infer<typeof chatSchema>;

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string().describe("The ID of the chat this message belongs to"),
  role: z.string(),
  parts: z.any(), // JSON type
  attachments: z.any().optional(), // JSON type
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type DBMessage = z.infer<typeof messageSchema>;
