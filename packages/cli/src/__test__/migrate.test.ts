import { defineAgentConfig } from "agent-stack";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateAction } from "../commands/migrate";
import * as config from "../utils/get-config";

describe("migrate base agent instance", () => {
  const db = new Database(":memory:");

  const agentStack = defineAgentConfig({
    memory: db,
    // biome-ignore lint/suspicious/noExplicitAny: is fine
    agent: {} as any,
  });

  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((code) => {
      return code as never;
    });
    vi.spyOn(config, "getConfig").mockImplementation(async () => agentStack);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  it("should migrate the database", async () => {
    await migrateAction({
      cwd: process.cwd(),
      config: "test/agent.ts",
      y: true,
    });
    const res = db
      .prepare(
        `INSERT INTO project (id, authorId, title, visibility, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "proj-1",
        "user-123",
        "My Test Project",
        "public",
        new Date().toISOString(),
        new Date().toISOString(),
      );
    expect(res.changes).toBe(1);
  });
});
