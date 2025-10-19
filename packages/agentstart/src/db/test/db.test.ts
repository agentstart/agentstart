import { describe, expect, it } from "vitest";
import { getTables } from "@/db";
import { convertFromDB, convertToDB } from "@/db/utils";
import type { AgentStartOptions } from "@/types";

describe("db helpers", () => {
  const options: Omit<AgentStartOptions, "agent"> = {
    thread: {
      modelName: "threads",
      fields: {
        title: "thread_title",
      },
    },
    message: {
      fields: {
        parts: "message_parts",
      },
    },
    todo: {
      fields: {
        todos: "todo_payload",
      },
    },
  };

  it("applies custom model and field names", () => {
    const tables = getTables(options);

    expect(tables.thread?.modelName).toBe("threads");
    expect(tables.thread?.fields.title?.fieldName).toBe("thread_title");
    expect(tables.message?.fields.parts?.fieldName).toBe("message_parts");
    expect(tables.todo?.fields.todos?.fieldName).toBe("todo_payload");
    expect(Object.keys(tables.todo?.fields ?? {})).toEqual([
      "threadId",
      "todos",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("converts logical values to database columns and back", () => {
    const tables = getTables(options);
    const threadFields = tables.thread?.fields;
    expect(threadFields).toBeDefined();

    const stored = convertToDB(threadFields!, {
      id: "thread-1",
      title: "Agent Start",
      userId: "author-1",
      visibility: "private",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });

    expect(stored).toMatchObject({
      id: "thread-1",
      userId: "author-1",
      thread_title: "Agent Start",
    });

    const hydrated = convertFromDB(threadFields!, stored);
    expect(hydrated).toMatchObject({
      id: "thread-1",
      userId: "author-1",
      title: "Agent Start",
    });
  });

  it("defines todo table with thread reference and defaults", () => {
    const tables = getTables(options);
    const todoFields = tables.todo?.fields;

    expect(todoFields).toBeDefined();

    expect(todoFields?.threadId?.references).toMatchObject({
      model: "threads",
      field: "id",
      onDelete: "cascade",
    });
    expect(todoFields?.todos?.required).toBe(true);
    expect(todoFields?.todos?.type).toBe("json");
    expect(todoFields?.todos?.validator?.output).toBeDefined();
    expect(typeof todoFields?.createdAt?.defaultValue).toBe("function");
    expect(typeof todoFields?.updatedAt?.defaultValue).toBe("function");
  });
});
