/* agent-frontmatter:start
AGENT: Agent memory actions
PURPOSE: Provide persistence helpers backed by the configured adapter
USAGE: Import to read or mutate chat, project, and message records
EXPORTS: getAdapterMethods, updateChatTitle, updateProjectTitle, upsertMessage, deleteMessagesAfter, loadChat, getCompleteMessages
FEATURES:
  - Normalizes adapter initialization through a cached context
  - Applies consistent timestamp handling and payload sanitization
  - Uses object-based parameters for extensibility
SEARCHABLE: agent actions, memory helpers, chat persistence
agent-frontmatter:end */

import type { UIMessage } from "ai";

import type {
  AdapterWhereCondition,
  DatabaseAdapterInstance,
  DatabaseAdapterMethods,
} from "../../adapters";
import type { AgentStackUIMessage } from "../messages";

type AdapterWhere = AdapterWhereCondition[];

const defaultAdapterContext = {
  schema: {},
  debugLog: () => undefined,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
} as const;

const adapterCache = new WeakMap<
  DatabaseAdapterInstance<unknown>,
  DatabaseAdapterMethods
>();

export interface AdapterContextOptions {
  memory: DatabaseAdapterInstance<unknown>;
}

export function getAdapterMethods({
  memory,
}: AdapterContextOptions): DatabaseAdapterMethods {
  const cached = adapterCache.get(memory);
  if (cached) {
    return cached;
  }
  const methods = memory.initialize({ ...defaultAdapterContext });
  adapterCache.set(memory, methods);
  return methods;
}

export interface UpdateChatTitleOptions extends AdapterContextOptions {
  chatId: string;
  title: string;
  emoji?: string;
}

export async function updateChatTitle({
  memory,
  chatId,
  title,
  emoji,
}: UpdateChatTitleOptions) {
  const adapter = getAdapterMethods({ memory });
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
  memory,
  projectId,
  title,
  emoji,
}: UpdateProjectTitleOptions) {
  const adapter = getAdapterMethods({ memory });
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
  memory,
  payload,
}: UpsertMessageOptions<Message>) {
  if (!payload.message.parts || payload.message.parts.length === 0) {
    throw new Error("Message must have at least one part");
  }

  const adapter = getAdapterMethods({ memory });
  const where: AdapterWhere = [{ field: "id", value: payload.id }];
  const now = new Date().toISOString();
  const storedParts = JSON.parse(
    JSON.stringify(payload.message.parts),
  ) as typeof payload.message.parts;
  const storedMetadata = payload.message.metadata
    ? (JSON.parse(
        JSON.stringify(payload.message.metadata),
      ) as typeof payload.message.metadata)
    : undefined;

  const baseDocument: Record<string, unknown> = {
    chatId: payload.chatId,
    role: payload.message.role,
    parts: storedParts,
    ...(storedMetadata ? { metadata: storedMetadata } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await adapter.upsert({
    model: "message",
    where,
    create: {
      id: payload.id,
      ...baseDocument,
    },
    update: baseDocument,
  });
}

export interface DeleteMessagesAfterOptions extends AdapterContextOptions {
  chatId: string;
  messageId: string;
}

export async function deleteMessagesAfter({
  memory,
  chatId,
  messageId,
}: DeleteMessagesAfterOptions) {
  const adapter = getAdapterMethods({ memory });
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
  memory,
  chatId,
}: LoadChatOptions): Promise<Message[]> {
  const adapter = getAdapterMethods({ memory });
  const records = (await adapter.findMany({
    model: "message",
    where: [{ field: "chatId", value: chatId }],
    sortBy: [{ field: "createdAt", direction: "asc" }],
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
  memory,
  message,
  chatId,
}: GetCompleteMessagesOptions<Message>): Promise<Message[] | undefined> {
  // Delete any messages after this one (for regeneration scenarios)
  await deleteMessagesAfter({ memory, chatId, messageId: message.id });
  // create or update last message in database
  await upsertMessage({
    memory,
    payload: { chatId, id: message.id, message },
  });
  // load the previous messages from the server:
  const messages = await loadChat<Message>({ memory, chatId });
  return messages;
}
