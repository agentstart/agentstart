/* agent-frontmatter:start
AGENT: Agent memory actions
PURPOSE: Provide persistence helpers backed by the configured db
USAGE: Import to read or mutate thread and message records
EXPORTS: updateThreadTitle, upsertMessage, deleteMessagesAfter, loadThread, getCompleteMessages, getThreads
FEATURES:
  - Works with any db implementing the shared Adapter interface
  - Applies consistent timestamp handling and payload sanitization
  - Uses object-based parameters for extensibility
SEARCHABLE: agent actions, memory helpers, thread persistence
agent-frontmatter:end */

import type { UIMessage } from "ai";
import type { AgentStartUIMessage } from "@/agent/messages";
import type { DBThread } from "@/db";
import type { Adapter, Where as AdapterWhere } from "@/types";

export interface AdapterContextOptions {
  db: Adapter;
}

export interface UpdateThreadTitleOptions extends AdapterContextOptions {
  threadId: string;
  title: string;
  emoji?: string;
}

export async function updateThreadTitle({
  db,
  threadId,
  title,
  emoji,
}: UpdateThreadTitleOptions) {
  const updatePayload: Record<string, unknown> = {
    title,
    updatedAt: new Date().toISOString(),
  };
  if (emoji !== undefined) {
    updatePayload.emoji = emoji;
  }

  await db.update({
    model: "thread",
    where: [{ field: "id", value: threadId }],
    update: updatePayload,
  });
}

export interface UpsertMessagePayload<Message extends UIMessage = UIMessage> {
  id: string;
  threadId: string;
  message: Message;
}

export interface UpsertMessageOptions<Message extends UIMessage>
  extends AdapterContextOptions {
  payload: UpsertMessagePayload<Message>;
}

export async function upsertMessage<Message extends UIMessage>({
  db,
  payload,
}: UpsertMessageOptions<Message>) {
  if (!payload.message.parts || payload.message.parts.length === 0) {
    throw new Error("Message must have at least one part");
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

  await db.upsert({
    model: "message",
    where,
    create: {
      id: payload.id,
      threadId: payload.threadId,
      role: payload.message.role,
      createdAt: now,
    },
    update: updateDocument,
  });
}

export interface DeleteMessagesAfterOptions extends AdapterContextOptions {
  threadId: string;
  messageId: string;
}

export async function deleteMessagesAfter({
  db,
  threadId,
  messageId,
}: DeleteMessagesAfterOptions) {
  const target = (await db.findOne({
    model: "message",
    where: [
      { field: "id", value: messageId },
      { field: "threadId", value: threadId },
    ],
  })) as Record<string, unknown> | null | undefined;

  const createdAt =
    typeof target?.createdAt === "string" ? target.createdAt : undefined;
  if (!createdAt) {
    return;
  }

  await db.deleteMany({
    model: "message",
    where: [
      { field: "threadId", value: threadId },
      { field: "createdAt", operator: "gt", value: createdAt },
    ],
  });
}

export interface LoadThreadOptions extends AdapterContextOptions {
  threadId: string;
}

export async function loadThread<Message extends UIMessage>({
  db,
  threadId,
}: LoadThreadOptions): Promise<Message[]> {
  const records = await db.findMany<Record<string, unknown>>({
    model: "message",
    where: [{ field: "threadId", value: threadId }],
    sortBy: { field: "createdAt", direction: "asc" },
  });

  return records
    .map((record: Record<string, unknown>) => {
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
            threadId,
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
            threadId,
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
            threadId,
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

export interface GetThreadsOptions extends AdapterContextOptions {
  userId?: string;
  limit?: number;
  offset?: number;
}

export const getThreads = async ({
  db,
  userId,
  limit,
  offset,
}: GetThreadsOptions): Promise<DBThread[]> => {
  const where = userId
    ? ([{ field: "userId", value: userId }] as AdapterWhere[])
    : undefined;

  const records = await db.findMany<DBThread>({
    model: "thread",
    where,
    sortBy: { field: "updatedAt", direction: "desc" },
    limit,
    offset,
  });

  return records;
};

export interface GetCompleteMessagesOptions<Message extends UIMessage>
  extends AdapterContextOptions {
  message: Message;
  threadId: string;
}

export async function getCompleteMessages<
  Message extends UIMessage = AgentStartUIMessage,
>({
  db,
  message,
  threadId,
}: GetCompleteMessagesOptions<Message>): Promise<Message[] | undefined> {
  await deleteMessagesAfter({ db, threadId, messageId: message.id });
  await upsertMessage({
    db,
    payload: { threadId, id: message.id, message },
  });
  return loadThread<Message>({ db, threadId });
}
