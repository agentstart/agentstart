/* agent-frontmatter:start
AGENT: Memory adapter conformance suite
PURPOSE: Validate adapter behaviour for thread and message models
USAGE: runAdapterTest({ getAdapter })
EXPORTS: runAdapterTest
FEATURES:
  - Exercises CRUD flows across thread and message entities
  - Covers filtering, sorting, pagination, counting, and custom ID generation
SEARCHABLE: memory adapter test suite, thread message validation
agent-frontmatter:end */

import type { AgentStartOptions, MemoryAdapter } from "@agentstart/types";
import { expect, test } from "vitest";
import type { DBMessage, DBThread } from "../schema";

interface AdapterTestOptions {
  getAdapter: (
    customOptions?: Omit<AgentStartOptions, "memory" | "agent">,
  ) => Promise<MemoryAdapter>;
  skipGenerateIdTest?: boolean;
}

export async function runAdapterTest(opts: AdapterTestOptions) {
  const adapter = await opts.getAdapter();

  let thread: DBThread & Record<string, unknown> = {
    id: "thread-1",
    title: "General discussion",
    userId: "author-1",
    visibility: "private",
    lastContext: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let message: DBMessage & Record<string, unknown> = {
    id: "msg-1",
    threadId: thread.id,
    role: "user",
    parts: [{ type: "text", value: "Hello world" }],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdThreads: string[] = [];

  test("create thread model", async () => {
    const res = await adapter.create({
      model: "thread",
      data: thread,
    });
    expect(res).toMatchObject({
      title: thread.title,
      userId: thread.userId,
    });
    thread = { ...thread, ...res };
    createdThreads.push(thread.id);
  });

  test("find thread by id", async () => {
    const res = await adapter.findOne<DBThread>({
      model: "thread",
      where: [
        {
          field: "id",
          value: thread.id,
        },
      ],
    });
    expect(res).not.toBeNull();
    expect(res?.title).toBe(thread.title);
  });

  test("should return Date objects for date fields", async () => {
    const res = await adapter.findOne<DBThread>({
      model: "thread",
      where: [
        {
          field: "id",
          value: thread.id,
        },
      ],
    });
    expect(res).not.toBeNull();
    expect(res?.createdAt).toBeInstanceOf(Date);
    expect(res?.updatedAt).toBeInstanceOf(Date);
  });

  test("create additional threads for filtering", async () => {
    const alpha = await adapter.create<DBThread>({
      model: "thread",
      data: {
        id: "thread-alpha",
        title: "alpha-room",
        userId: "author-1",
        visibility: "public",
        lastContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    const beta = await adapter.create<DBThread>({
      model: "thread",
      data: {
        id: "thread-beta",
        title: "beta-room",
        userId: "author-2",
        visibility: "public",
        lastContext: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdThreads.push(alpha.id, beta.id);
    expect(createdThreads.length).toBeGreaterThanOrEqual(3);
  });

  test("should find many threads with IN operator", async () => {
    const res = await adapter.findMany<DBThread>({
      model: "thread",
      where: [
        {
          field: "id",
          operator: "in",
          value: createdThreads,
        },
      ],
    });
    expect(res.length).toBe(createdThreads.length);
  });

  test("should find many threads with string operators", async () => {
    const contains = await adapter.findMany<DBThread>({
      model: "thread",
      where: [
        {
          field: "title",
          operator: "contains",
          value: "room",
        },
      ],
    });
    expect(contains.length).toBeGreaterThanOrEqual(2);

    const startsWith = await adapter.findMany<DBThread>({
      model: "thread",
      where: [
        {
          field: "title",
          operator: "starts_with",
          value: "alpha",
        },
      ],
    });
    expect(startsWith[0]?.title).toBe("alpha-room");

    const endsWith = await adapter.findMany<DBThread>({
      model: "thread",
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

  test("should sort threads by title", async () => {
    const asc = await adapter.findMany<DBThread>({
      model: "thread",
      sortBy: {
        field: "title",
        direction: "asc",
      },
    });
    expect(asc[0]?.title).toBe("alpha-room");

    const desc = await adapter.findMany<DBThread>({
      model: "thread",
      sortBy: {
        field: "title",
        direction: "desc",
      },
    });
    expect(desc[desc.length - 1]?.title).toBe("alpha-room");
  });

  test("should respect limit and offset", async () => {
    const limited = await adapter.findMany({
      model: "thread",
      limit: 1,
    });
    expect(limited.length).toBe(1);

    const offset = await adapter.findMany({
      model: "thread",
      offset: 1,
    });
    expect(offset.length).toBeGreaterThanOrEqual(1);
  });

  test("should update many threads", async () => {
    const updatedCount = await adapter.updateMany({
      model: "thread",
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
    const visibility = await adapter.findMany<DBThread>({
      model: "thread",
      where: [
        {
          field: "visibility",
          value: "private",
        },
      ],
    });
    expect(visibility.length).toBeGreaterThanOrEqual(3);
  });

  test("should count threads by user", async () => {
    const total = await adapter.count({
      model: "thread",
      where: [
        {
          field: "userId",
          value: "author-1",
        },
      ],
    });
    expect(total).toBeGreaterThanOrEqual(2);
  });

  test("create message model", async () => {
    message.threadId = thread.id;
    const res = await adapter.create({
      model: "message",
      data: message,
    });
    message = { ...message, ...res };
    expect(res).toMatchObject({
      threadId: thread.id,
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

  test("update message role", async () => {
    const res = await adapter.update({
      model: "message",
      where: [
        {
          field: "id",
          value: message.id,
        },
      ],
      update: {
        role: "assistant",
      },
    });
    expect(res).toMatchObject({
      role: "assistant",
    });
    message.role = "assistant";
  });

  test("should find many messages by thread", async () => {
    const secondMessageId = "msg-2";
    const secondMessage = await adapter.create({
      model: "message",
      data: {
        id: secondMessageId,
        threadId: thread.id,
        role: "assistant",
        parts: [{ type: "text", value: "Hi again" }],
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    expect(secondMessage.id).toBe(secondMessageId);

    const res = await adapter.findMany({
      model: "message",
      where: [
        {
          field: "threadId",
          value: thread.id,
        },
      ],
    });
    expect(res.length).toBeGreaterThanOrEqual(2);

    const count = await adapter.count({
      model: "message",
      where: [
        {
          field: "threadId",
          value: thread.id,
        },
      ],
    });
    expect(count).toBeGreaterThanOrEqual(2);

    await adapter.delete({
      model: "message",
      where: [
        {
          field: "id",
          value: secondMessageId,
        },
      ],
    });
  });

  test("should return Date objects in findMany results", async () => {
    const res = await adapter.findMany<DBThread>({
      model: "thread",
      limit: 1,
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0]?.createdAt).toBeInstanceOf(Date);
    expect(res[0]?.updatedAt).toBeInstanceOf(Date);
  });

  test("should query by date fields", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const res = await adapter.findMany<DBThread>({
      model: "thread",
      where: [
        {
          field: "createdAt",
          operator: "gt",
          value: yesterday,
        },
      ],
    });
    expect(res.length).toBeGreaterThan(0);
    res.forEach((thread) => {
      expect(thread.createdAt).toBeInstanceOf(Date);
      expect(thread.createdAt.getTime()).toBeGreaterThan(yesterday.getTime());
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

  test("should delete many threads", async () => {
    const idsToRemove = [...createdThreads];
    const before = await adapter.findMany({
      model: "thread",
      where: [
        {
          field: "id",
          operator: "in",
          value: idsToRemove,
        },
      ],
    });
    expect(before.length).toBe(createdThreads.length);

    const deleted = await adapter.deleteMany({
      model: "thread",
      where: [
        {
          field: "id",
          operator: "in",
          value: idsToRemove,
        },
      ],
    });
    expect(deleted).toBe(createdThreads.length);

    const after = await adapter.findMany({
      model: "thread",
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
        model: "thread",
        data: {
          id: "thread-temp",
          title: "Thread with custom id",
          userId: "author-gen",
          visibility: "private",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      expect(res.id).toBe("mocked-id");
    },
  );
}
