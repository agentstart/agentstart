/* agent-frontmatter:start
AGENT: Memory adapter schema builder
PURPOSE: Produce model metadata consumed by database adapters
USAGE: const tables = getTables(options)
EXPORTS: getTables
FEATURES:
  - Defines thread/message structures used by Agent Start
  - Allows field renaming and additional fields via options
  - Mirrors Agent Start table generation without plugin logic
SEARCHABLE: memory adapter schema, table metadata, getTables, thread schema
agent-frontmatter:end */

import type { AgentStartOptions, FieldAttribute } from "@agentstart/types";
import { todoPayloadSchema } from "./schema";

export type MemoryAdapterDbSchema = Record<
  string,
  {
    modelName: string;
    fields: Record<string, FieldAttribute>;
  }
>;

export const getTables = (
  options: Omit<AgentStartOptions, "agent">,
): MemoryAdapterDbSchema => {
  return {
    thread: {
      modelName: options.thread?.modelName || "thread",
      fields: {
        title: {
          type: "string",
          required: true,
          fieldName: options.thread?.fields?.title || "title",
        },
        userId: {
          type: "string",
          required: true,
          fieldName: options.thread?.fields?.userId || "userId",
        },
        visibility: {
          type: "string",
          required: true,
          defaultValue: () => "private",
          fieldName: options.thread?.fields?.visibility || "visibility",
        },
        lastContext: {
          type: "json",
          required: false,
          fieldName: options.thread?.fields?.lastContext || "lastContext",
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.thread?.fields?.createdAt || "createdAt",
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.thread?.fields?.updatedAt || "updatedAt",
        },
        ...(options.thread?.additionalFields ?? {}),
      },
    },
    message: {
      modelName: options.message?.modelName || "message",
      fields: {
        threadId: {
          type: "string",
          required: true,
          fieldName: options.message?.fields?.threadId || "threadId",
          references: {
            model: options.thread?.modelName || "thread",
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
          type: "json",
          required: true,
          fieldName: options.message?.fields?.parts || "parts",
        },
        attachments: {
          type: "json",
          required: false,
          fieldName: options.message?.fields?.attachments || "attachments",
        },
        metadata: {
          type: "json",
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
    todo: {
      modelName: options.todo?.modelName || "todo",
      fields: {
        threadId: {
          type: "string",
          required: true,
          unique: true,
          fieldName: options.todo?.fields?.threadId || "threadId",
          references: {
            model: options.thread?.modelName || "thread",
            field: "id",
            onDelete: "cascade",
          },
        },
        todos: {
          type: "json",
          required: true,
          fieldName: options.todo?.fields?.todos || "todos",
          validator: {
            input: todoPayloadSchema,
            output: todoPayloadSchema,
          },
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.todo?.fields?.createdAt || "createdAt",
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: () => new Date(),
          fieldName: options.todo?.fields?.updatedAt || "updatedAt",
        },
        ...(options.todo?.additionalFields ?? {}),
      },
    },
  };
};
