/* agent-frontmatter:start
AGENT: Adapter conformance suite
PURPOSE: Validate adapter behaviour for project, chat, and message models
USAGE: runAdapterTest({ getAdapter })
EXPORTS: runAdapterTest
FEATURES:
  - Exercises CRUD flows across project, chat, and message entities
  - Covers filtering, sorting, pagination, counting, and custom ID generation
SEARCHABLE: adapter test suite, project chat message validation
agent-frontmatter:end */

import { expect, test } from "vitest";
import type { DBChat, DBMessage, DBProject } from "../db/schema";
import type { Adapter, AgentStackOptions } from "../types";

interface AdapterTestOptions {
  getAdapter: (
    customOptions?: Omit<AgentStackOptions, "memory" | "agent">,
  ) => Promise<Adapter>;
  skipGenerateIdTest?: boolean;
}

export async function runAdapterTest(opts: AdapterTestOptions) {
  const adapter = await opts.getAdapter();

  let project: DBProject & Record<string, unknown> = {
    id: "proj-1",
    authorId: "author-1",
    title: "Agent Stack",
    emoji: "🤖",
    visibility: "public",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let chat: DBChat & Record<string, unknown> = {
    id: "chat-1",
    projectId: project.id,
    title: "General discussion",
    userId: "author-1",
    visibility: "private",
    lastContext: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let message: DBMessage & Record<string, unknown> = {
    id: "msg-1",
    chatId: chat.id,
    role: "user",
    parts: [{ type: "text", value: "Hello world" }],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdChats: string[] = [];

  test("create project model", async () => {
    const res = await adapter.create({
      model: "project",
      data: project,
    });
    expect(res).toMatchObject({
      title: project.title,
      authorId: project.authorId,
    });
    project = { ...project, ...res };
    chat.projectId = project.id;
  });

  test("find project by id", async () => {
    const res = await adapter.findOne<DBProject>({
      model: "project",
      where: [
        {
          field: "id",
          value: project.id,
        },
      ],
    });
    expect(res).not.toBeNull();
    expect(res?.title).toBe(project.title);
  });

  test("find project with select", async () => {
    const res = await adapter.findOne({
      model: "project",
      where: [
        {
          field: "id",
          value: project.id,
        },
      ],
      select: ["title"],
    });
    expect(res).toMatchObject({
      title: project.title,
    });
  });

  test("update project title", async () => {
    const updatedTitle = "Agent Stack Updated";
    const res = await adapter.update<DBProject>({
      model: "project",
      where: [
        {
          field: "id",
          value: project.id,
        },
      ],
      update: {
        title: updatedTitle,
      },
    });
    expect(res).toMatchObject({
      title: updatedTitle,
    });
    project.title = updatedTitle;
  });

  test("create chat for project", async () => {
    chat.projectId = project.id;
    const res = await adapter.create({
      model: "chat",
      data: chat,
    });
    chat = { ...chat, ...res };
    createdChats.push(chat.id);
    expect(res).toMatchObject({
      title: "General discussion",
      projectId: project.id,
    });
  });

  test("find chat by projectId", async () => {
    const res = await adapter.findOne<DBChat>({
      model: "chat",
      where: [
        {
          field: "projectId",
          value: project.id,
        },
      ],
    });
    expect(res?.projectId).toBe(project.id);
  });

  test("create additional chats for filtering", async () => {
    const alpha = await adapter.create<DBChat>({
      model: "chat",
      data: {
        id: "chat-alpha",
        projectId: project.id,
        title: "alpha-room",
        userId: "author-1",
        visibility: "public",
        lastContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const beta = await adapter.create<DBChat>({
      model: "chat",
      data: {
        id: "chat-beta",
        projectId: project.id,
        title: "beta-room",
        userId: "author-2",
        visibility: "public",
        lastContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdChats.push(alpha.id, beta.id);
    expect(createdChats.length).toBeGreaterThanOrEqual(3);
  });

  test("should find many chats with IN operator", async () => {
    const res = await adapter.findMany<DBChat>({
      model: "chat",
      where: [
        {
          field: "id",
          operator: "in",
          value: createdChats,
        },
      ],
    });
    expect(res.length).toBe(createdChats.length);
  });

  test("should find many chats with string operators", async () => {
    const contains = await adapter.findMany<DBChat>({
      model: "chat",
      where: [
        {
          field: "title",
          operator: "contains",
          value: "room",
        },
      ],
    });
    expect(contains.length).toBeGreaterThanOrEqual(2);

    const startsWith = await adapter.findMany<DBChat>({
      model: "chat",
      where: [
        {
          field: "title",
          operator: "starts_with",
          value: "alpha",
        },
      ],
    });
    expect(startsWith[0]?.title).toBe("alpha-room");

    const endsWith = await adapter.findMany<DBChat>({
      model: "chat",
      where: [
        {
          field: "title",
          operator: "ends_with",
          value: "room",
        },
      ],
    });
    expect(endsWith.length).toBeGreaterThanOrEqual(2);
  });

  test("should sort chats by title", async () => {
    const asc = await adapter.findMany<DBChat>({
      model: "chat",
      sortBy: {
        field: "title",
        direction: "asc",
      },
    });
    expect(asc[0]?.title).toBe("alpha-room");

    const desc = await adapter.findMany<DBChat>({
      model: "chat",
      sortBy: {
        field: "title",
        direction: "desc",
      },
    });
    expect(desc[desc.length - 1]?.title).toBe("alpha-room");
  });

  test("should respect limit and offset", async () => {
    const limited = await adapter.findMany({
      model: "chat",
      limit: 1,
    });
    expect(limited.length).toBe(1);

    const offset = await adapter.findMany({
      model: "chat",
      offset: 1,
    });
    expect(offset.length).toBeGreaterThanOrEqual(1);
  });

  test("should update many chats", async () => {
    const updatedCount = await adapter.updateMany({
      model: "chat",
      where: [
        {
          field: "visibility",
          value: "public",
        },
      ],
      update: {
        visibility: "private",
      },
    });
    expect(updatedCount).toBeGreaterThanOrEqual(2);
    const visibility = await adapter.findMany<DBChat>({
      model: "chat",
      where: [
        {
          field: "visibility",
          value: "private",
        },
      ],
    });
    expect(visibility.length).toBeGreaterThanOrEqual(3);
  });

  test("should count chats by project", async () => {
    const total = await adapter.count({
      model: "chat",
      where: [
        {
          field: "projectId",
          value: project.id,
        },
      ],
    });
    expect(total).toBeGreaterThanOrEqual(3);
  });

  test("create message model", async () => {
    message.chatId = chat.id;
    const res = await adapter.create({
      model: "message",
      data: message,
    });
    message = { ...message, ...res };
    expect(res).toMatchObject({
      chatId: chat.id,
      role: "user",
    });
  });

  test("find message with select", async () => {
    const res = await adapter.findOne({
      model: "message",
      where: [
        {
          field: "id",
          value: message.id,
        },
      ],
      select: ["parts"],
    });
    expect(res).toMatchObject({
      parts: message.parts,
    });
  });

  test("should find many messages by chat", async () => {
    const secondMessage = await adapter.create<DBMessage>({
      model: "message",
      data: {
        id: "msg-2",
        chatId: chat.id,
        role: "assistant",
        parts: [{ type: "text", value: "Hi there!" }],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const res = await adapter.findMany({
      model: "message",
      where: [
        {
          field: "chatId",
          value: chat.id,
        },
      ],
    });
    expect(res.length).toBeGreaterThanOrEqual(2);

    const count = await adapter.count({
      model: "message",
      where: [
        {
          field: "chatId",
          value: chat.id,
        },
      ],
    });
    expect(count).toBeGreaterThanOrEqual(2);

    await adapter.delete({
      model: "message",
      where: [
        {
          field: "id",
          value: secondMessage.id,
        },
      ],
    });
  });

  test("delete message model", async () => {
    await adapter.delete({
      model: "message",
      where: [
        {
          field: "id",
          value: message.id,
        },
      ],
    });
    const res = await adapter.findOne({
      model: "message",
      where: [
        {
          field: "id",
          value: message.id,
        },
      ],
    });
    expect(res).toBeNull();
  });

  test("should delete many chats", async () => {
    const idsToRemove = [...createdChats];
    const before = await adapter.findMany({
      model: "chat",
      where: [
        {
          field: "id",
          operator: "in",
          value: idsToRemove,
        },
      ],
    });
    expect(before.length).toBe(createdChats.length);

    const deleted = await adapter.deleteMany({
      model: "chat",
      where: [
        {
          field: "id",
          operator: "in",
          value: idsToRemove,
        },
      ],
    });
    expect(deleted).toBe(createdChats.length);

    const after = await adapter.findMany({
      model: "chat",
      where: [
        {
          field: "id",
          operator: "in",
          value: idsToRemove,
        },
      ],
    });
    expect(after.length).toBe(0);
  });

  test("should not throw when deleting missing message", async () => {
    await adapter.delete({
      model: "message",
      where: [
        {
          field: "id",
          value: "msg-missing",
        },
      ],
    });
  });

  test("should return null for missing message", async () => {
    const res = await adapter.findOne({
      model: "message",
      where: [
        {
          field: "id",
          value: "msg-missing",
        },
      ],
    });
    expect(res).toBeNull();
  });

  test.skipIf(opts.skipGenerateIdTest)(
    "should prefer generateId if provided",
    async () => {
      const customAdapter = await opts.getAdapter({
        advanced: {
          generateId: () => "mocked-id",
        },
      });

      const res = await customAdapter.create({
        model: "project",
        data: {
          id: "proj-temp",
          authorId: "author-gen",
          title: "Project with custom id",
          emoji: null,
          visibility: "public",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(res.id).toBe("mocked-id");
    },
  );
}
