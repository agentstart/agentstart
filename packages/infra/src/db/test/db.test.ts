import type { AgentStackOptions } from "@agent-stack/types";
import { describe, expect, it } from "vitest";
import { getTables } from "..";
import { convertFromDB, convertToDB } from "../utils";

describe("db helpers", () => {
  const options: Omit<AgentStackOptions, "agent"> = {
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
  };

  it("applies custom model and field names", () => {
    const tables = getTables(options);

    expect(tables.thread?.modelName).toBe("threads");
    expect(tables.thread?.fields.title?.fieldName).toBe("thread_title");
    expect(tables.message?.fields.parts?.fieldName).toBe("message_parts");
  });

  it("converts logical values to database columns and back", () => {
    const tables = getTables(options);
    const threadFields = tables.thread?.fields;
    expect(threadFields).toBeDefined();

    const stored = convertToDB(threadFields!, {
      id: "thread-1",
      title: "Agent Stack",
      userId: "author-1",
      visibility: "private",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });

    expect(stored).toMatchObject({
      id: "thread-1",
      userId: "author-1",
      thread_title: "Agent Stack",
    });

    const hydrated = convertFromDB(threadFields!, stored);
    expect(hydrated).toMatchObject({
      id: "thread-1",
      userId: "author-1",
      title: "Agent Stack",
    });
  });
});
