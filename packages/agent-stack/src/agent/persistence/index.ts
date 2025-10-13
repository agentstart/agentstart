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
  const storedParts = JSON.parse(
    JSON.stringify(payload.message.parts),
  ) as typeof payload.message.parts;
  const storedMetadata = payload.message.metadata
    ? (JSON.parse(
        JSON.stringify(payload.message.metadata),
      ) as typeof payload.message.metadata)
    : undefined;

  const updateDocument: Record<string, unknown> = {
    parts: storedParts,
    ...(storedMetadata ? { metadata: storedMetadata } : {}),
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
  const records = (await adapter.findMany({
    model: "message",
    where: [{ field: "chatId", value: chatId }],
    sortBy: { field: "createdAt", direction: "asc" },
  })) as Array<Record<string, unknown>>;

  return records
    .map((record) => {
      const parts = Array.isArray(record.parts)
        ? (JSON.parse(JSON.stringify(record.parts)) as Message["parts"])
        : undefined;
      if (!parts || parts.length === 0) {
        return undefined;
      }
      const metadata =
        typeof record.metadata === "object" && record.metadata !== null
          ? (JSON.parse(JSON.stringify(record.metadata)) as Message["metadata"])
          : undefined;

      return {
        id: String(record.id ?? ""),
        role: record.role as Message["role"],
        parts,
        ...(metadata ? { metadata } : {}),
      } as Message;
    })
    .filter((message): message is Message => Boolean(message));
}

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
