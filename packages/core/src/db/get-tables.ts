/* agent-frontmatter:start
AGENT: Adapter schema builder
PURPOSE: Produce model metadata consumed by database adapters
USAGE: const tables = getAuthTables(options)
EXPORTS: getAuthTables
FEATURES:
  - Defines project/chat/message structures used by Agent Stack
  - Allows field renaming and additional fields via options
  - Mirrors Agent Stack table generation without plugin logic
SEARCHABLE: adapter schema, table metadata, getAuthTables
agent-frontmatter:end */

import type { AgentStackOptions } from "../types";
import type { FieldAttribute } from "./field";

export type AdapterDbSchema = Record<
  string,
  {
    modelName: string;
    fields: Record<string, FieldAttribute>;
  }
>;

export const getAuthTables = (
  options: Omit<AgentStackOptions, "agents">,
): AdapterDbSchema => {
  return {
    project: {
      modelName: options.project?.modelName || "project",
      fields: {
        id: {
          type: "string",
          required: true,
          fieldName: options.project?.fields?.id || "id",
        },
        authorId: {
          type: "string",
          required: true,
          fieldName: options.project?.fields?.authorId || "authorId",
        },
        title: {
          type: "string",
          required: true,
          fieldName: options.project?.fields?.title || "title",
        },
        emoji: {
          type: "string",
          required: false,
          fieldName: options.project?.fields?.emoji || "emoji",
        },
        visibility: {
          type: "string",
          required: true,
          defaultValue: () => "public",
          fieldName: options.project?.fields?.visibility || "visibility",
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.project?.fields?.createdAt || "createdAt",
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.project?.fields?.updatedAt || "updatedAt",
        },
        ...(options.project?.additionalFields ?? {}),
      },
    },
    chat: {
      modelName: options.chat?.modelName || "chat",
      fields: {
        id: {
          type: "string",
          required: true,
          fieldName: options.chat?.fields?.id || "id",
        },
        projectId: {
          type: "string",
          required: true,
          fieldName: options.chat?.fields?.projectId || "projectId",
          references: {
            model: options.project?.modelName || "project",
            field: "id",
            onDelete: "cascade",
          },
        },
        title: {
          type: "string",
          required: true,
          fieldName: options.chat?.fields?.title || "title",
        },
        userId: {
          type: "string",
          required: true,
          fieldName: options.chat?.fields?.userId || "userId",
        },
        visibility: {
          type: "string",
          required: true,
          defaultValue: () => "private",
          fieldName: options.chat?.fields?.visibility || "visibility",
        },
        lastContext: {
          type: "string",
          required: false,
          fieldName: options.chat?.fields?.lastContext || "lastContext",
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.chat?.fields?.createdAt || "createdAt",
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.chat?.fields?.updatedAt || "updatedAt",
        },
        ...(options.chat?.additionalFields ?? {}),
      },
    },
    message: {
      modelName: options.message?.modelName || "message",
      fields: {
        id: {
          type: "string",
          required: true,
          fieldName: options.message?.fields?.id || "id",
        },
        chatId: {
          type: "string",
          required: true,
          fieldName: options.message?.fields?.chatId || "chatId",
          references: {
            model: options.chat?.modelName || "chat",
            field: "id",
            onDelete: "cascade",
          },
        },
        role: {
          type: "string",
          required: true,
          fieldName: options.message?.fields?.role || "role",
        },
        parts: {
          type: "string",
          required: true,
          fieldName: options.message?.fields?.parts || "parts",
        },
        attachments: {
          type: "string",
          required: false,
          fieldName: options.message?.fields?.attachments || "attachments",
        },
        metadata: {
          type: "string",
          required: false,
          fieldName: options.message?.fields?.metadata || "metadata",
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.message?.fields?.createdAt || "createdAt",
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.message?.fields?.updatedAt || "updatedAt",
        },
        ...(options.message?.additionalFields ?? {}),
      },
    },
  };
};
