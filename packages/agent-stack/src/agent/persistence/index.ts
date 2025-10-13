/* agent-frontmatter:start
AGENT: Agent memory actions
PURPOSE: Provide persistence helpers backed by the configured adapter
USAGE: Import to read or mutate chat, project, and message records
EXPORTS: updateChatTitle, updateProjectTitle, upsertMessage, deleteMessagesAfter, loadChat, getCompleteMessages
FEATURES:
  - Works with any adapter implementing the shared Adapter interface
  - Applies consistent timestamp handling and payload sanitization
  - Uses object-based parameters for extensibility
SEARCHABLE: agent actions, memory helpers, chat persistence
agent-frontmatter:end */

import type { UIMessage } from "ai";
import type { DBChat } from "../../db";
import type { Adapter, Where as AdapterWhere } from "../../types";
import type { AgentStackUIMessage } from "../messages";

export interface AdapterContextOptions {
  adapter: Adapter;
}

export interface UpdateChatTitleOptions extends AdapterContextOptions {
  chatId: string;
  title: string;
  emoji?: string;
}

export async function updateChatTitle({
  adapter,
  chatId,
  title,
  emoji,
}: UpdateChatTitleOptions) {
  const updatePayload: Record<string, unknown> = {
    title,
    updatedAt: new Date().toISOString(),
  };
  if (emoji !== undefined) {
    updatePayload.emoji = emoji;
  }

  await adapter.update({
    model: "chat",
    where: [{ field: "id", value: chatId }],
    update: updatePayload,
  });
}

export interface UpdateProjectTitleOptions extends AdapterContextOptions {
  projectId: string;
  title: string;
  emoji?: string;
}

export async function updateProjectTitle({
  adapter,
  projectId,
  title,
  emoji,
}: UpdateProjectTitleOptions) {
  const updatePayload: Record<string, unknown> = {
    title,
    updatedAt: new Date().toISOString(),
  };
  if (emoji !== undefined) {
    updatePayload.emoji = emoji;
  }

  await adapter.update({
    model: "project",
    where: [{ field: "id", value: projectId }],
    update: updatePayload,
  });
}

export interface UpsertMessagePayload<Message extends UIMessage = UIMessage> {
  id: string;
  chatId: string;
  message: Message;
}

export interface UpsertMessageOptions<Message extends UIMessage>
  extends AdapterContextOptions {
  payload: UpsertMessagePayload<Message>;
}

export async function upsertMessage<Message extends UIMessage>({
  adapter,
  payload,
}: UpsertMessageOptions<Message>) {
  if (!payload.message.parts || payload.message.parts.length === 0) {
    throw new Error("Message must have at least one part");
  }

  if (!adapter.upsert) {
    throw new Error("Configured adapter does not implement upsert.");
  }

  const where: AdapterWhere[] = [{ field: "id", value: payload.id }];
  const now = new Date().toISOString();

  const serializedParts = JSON.stringify(payload.message.parts);
  const serializedMetadata =
    payload.message.metadata !== undefined
      ? JSON.stringify(payload.message.metadata)
      : undefined;
  const attachmentsValue = (
    payload.message as {
      attachments?: unknown;
    }
  ).attachments;
  const serializedAttachments =
    attachmentsValue !== undefined
      ? JSON.stringify(attachmentsValue)
      : undefined;

  const updateDocument: Record<string, unknown> = {
    parts: serializedParts,
    ...(serializedMetadata ? { metadata: serializedMetadata } : {}),
    ...(serializedAttachments ? { attachments: serializedAttachments } : {}),
    updatedAt: now,
  };

  await adapter.upsert({
    model: "message",
    where,
    create: {
      id: payload.id,
      chatId: payload.chatId,
      role: payload.message.role,
      createdAt: now,
    },
    update: updateDocument,
  });
}

export interface DeleteMessagesAfterOptions extends AdapterContextOptions {
  chatId: string;
  messageId: string;
}

export async function deleteMessagesAfter({
  adapter,
  chatId,
  messageId,
}: DeleteMessagesAfterOptions) {
  const target = (await adapter.findOne({
    model: "message",
    where: [
      { field: "id", value: messageId },
      { field: "chatId", value: chatId },
    ],
  })) as Record<string, unknown> | null | undefined;

  const createdAt =
    typeof target?.createdAt === "string" ? target.createdAt : undefined;
  if (!createdAt) {
    return;
  }

  await adapter.deleteMany({
    model: "message",
    where: [
      { field: "chatId", value: chatId },
      { field: "createdAt", operator: "gt", value: createdAt },
    ],
  });
}

export interface LoadChatOptions extends AdapterContextOptions {
  chatId: string;
}

export async function loadChat<Message extends UIMessage>({
  adapter,
  chatId,
}: LoadChatOptions): Promise<Message[]> {
  const records = await adapter.findMany<Record<string, unknown>>({
    model: "message",
    where: [{ field: "chatId", value: chatId }],
    sortBy: { field: "createdAt", direction: "asc" },
  });

  return records
    .map((record) => {
      let parts: Message["parts"] | undefined;

      if (Array.isArray(record.parts)) {
        parts = record.parts as Message["parts"];
      } else if (typeof record.parts === "string") {
        try {
          const parsed = JSON.parse(record.parts);
          if (Array.isArray(parsed)) {
            parts = parsed as Message["parts"];
          }
        } catch (error) {
          console.error("Failed to parse message parts", {
            chatId,
            messageId: record.id,
            error,
          });
        }
      }
      if (!parts || parts.length === 0) {
        return undefined;
      }
      let metadata: Message["metadata"] | undefined;
      let attachments: unknown;
      if (typeof record.metadata === "string") {
        try {
          metadata = JSON.parse(record.metadata) as Message["metadata"];
        } catch (error) {
          console.error("Failed to parse message metadata", {
            chatId,
            messageId: record.id,
            error,
          });
        }
      } else if (
        typeof record.metadata === "object" &&
        record.metadata !== null
      ) {
        metadata = JSON.parse(
          JSON.stringify(record.metadata),
        ) as Message["metadata"];
      }
      if (typeof record.attachments === "string") {
        try {
          attachments = JSON.parse(record.attachments);
        } catch (error) {
          console.error("Failed to parse message attachments", {
            chatId,
            messageId: record.id,
            error,
          });
        }
      } else if (
        Array.isArray(record.attachments) ||
        (typeof record.attachments === "object" && record.attachments !== null)
      ) {
        attachments = JSON.parse(JSON.stringify(record.attachments));
      }

      const message = {
        id: String(record.id ?? ""),
        role: record.role as Message["role"],
        parts,
        ...(metadata ? { metadata } : {}),
      } as Message;
      if (attachments !== undefined) {
        (message as Message & { attachments?: unknown }).attachments =
          attachments;
      }
      return message;
    })
    .filter((message): message is Message => Boolean(message));
}

export interface GetChatsByProjectIdOptions extends AdapterContextOptions {
  projectId: string;
}

export const getChatsByProjectId = async ({
  adapter,
  projectId,
}: GetChatsByProjectIdOptions): Promise<DBChat[]> => {
  const records = await adapter.findMany<DBChat>({
    model: "chat",
    where: [{ field: "projectId", value: projectId }],
    sortBy: { field: "updatedAt", direction: "desc" },
  });

  return records;
};

export interface GetCompleteMessagesOptions<Message extends UIMessage>
  extends AdapterContextOptions {
  message: Message;
  chatId: string;
}

export async function getCompleteMessages<
  Message extends UIMessage = AgentStackUIMessage,
>({
  adapter,
  message,
  chatId,
}: GetCompleteMessagesOptions<Message>): Promise<Message[] | undefined> {
  await deleteMessagesAfter({ adapter, chatId, messageId: message.id });
  await upsertMessage({
    adapter,
    payload: { chatId, id: message.id, message },
  });
  return loadChat<Message>({ adapter, chatId });
}
