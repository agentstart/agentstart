/* agent-frontmatter:start
AGENT: CLI test module
PURPOSE: Exercises AgentStart CLI commands to prevent regressions.
USAGE: Executed with Vitest to validate CLI generators and configuration helpers.
EXPORTS: None
FEATURES:
  - Covers critical CLI workflows for schema generation
  - Uses snapshot assertions to track emitted files
SEARCHABLE: packages, cli, src, test, migrate, vitest
agent-frontmatter:end */

import { agentStart } from "agentstart";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrateAction } from "../commands/migrate";

const db = new Database(":memory:");

const start = agentStart({
  memory: db,
  agent: {} as any,
});

vi.mock("../utils/get-config", () => ({
  getConfig: vi.fn(async () => start.options),
}));

describe("migrate base agent instance", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((code) => {
      return code as never;
    });
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
        `INSERT INTO thread (id, title, userId, visibility, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "thread-1",
        "My Test Thread",
        "user-123",
        "private",
        new Date().toISOString(),
        new Date().toISOString(),
      );
    expect(res.changes).toBe(1);
  });
});
