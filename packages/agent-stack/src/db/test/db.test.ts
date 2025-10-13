import { describe, expect, it } from "vitest";
import type { AgentStackOptions } from "../../types";
import { getTables } from "..";
import { convertFromDB, convertToDB } from "../utils";

describe("db helpers", () => {
  const options: Omit<AgentStackOptions, "agent"> = {
    project: {
      modelName: "projects",
      fields: {
        title: "project_title",
      },
    },
    chat: {
      modelName: "threads",
    },
    message: {
      fields: {
        parts: "message_parts",
      },
    },
  };

  it("applies custom model and field names", () => {
    const tables = getTables(options);

    expect(tables.project).toBeDefined();
    expect(tables.project?.modelName).toBe("projects");
    expect(tables.project?.fields.title?.fieldName).toBe("project_title");
    expect(tables.chat?.modelName).toBe("threads");
    expect(tables.message?.fields.parts?.fieldName).toBe("message_parts");
  });

  it("converts logical values to database columns and back", () => {
    const tables = getTables(options);
    const projectFields = tables.project?.fields;
    expect(projectFields).toBeDefined();

    const stored = convertToDB(projectFields!, {
      id: "proj-1",
      authorId: "author-1",
      title: "Agent Stack",
      visibility: "private",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    });

    expect(stored).toMatchObject({
      id: "proj-1",
      authorId: "author-1",
      project_title: "Agent Stack",
    });

    const hydrated = convertFromDB(projectFields!, stored);
    expect(hydrated).toMatchObject({
      id: "proj-1",
      authorId: "author-1",
      title: "Agent Stack",
    });
  });
});
