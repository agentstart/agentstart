/* agent-frontmatter:start
AGENT: Sandbox adapter test
PURPOSE: Validates the Node.js sandbox adapter behaviors using Vitest.
USAGE: Run during test suites to ensure local sandbox implementations stay compliant.
EXPORTS: None
FEATURES:
  - Covers Node.js sandbox scenario: git.test.ts
  - Guards regression on file system and git interactions
SEARCHABLE: packages, agentstart, src, sandbox, adapter, nodejs, tests, git, test, vitest
agent-frontmatter:end */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Git } from "@/sandbox/adapter/nodejs/git";

describe("Git", () => {
  let git: Git;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "git-test-"));
    git = new Git(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("init", () => {
    it("should initialize a new git repository", async () => {
      const result = await git.init();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      const gitDir = path.join(tempDir, ".git");
      const stats = await fs.stat(gitDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should initialize with custom initial branch", async () => {
      const result = await git.init(undefined, { initialBranch: "main" });

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.branch).toBe("main");
    });
  });

  describe("status", () => {
    beforeEach(async () => {
      await git.init();
    });

    it("should return clean status for empty repository", async () => {
      const status = await git.status();

      expect(status.clean).toBe(true);
      expect(status.modified).toHaveLength(0);
      expect(status.staged).toHaveLength(0);
      expect(status.untracked).toHaveLength(0);
    });

    it("should detect untracked files", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");

      const status = await git.status();

      expect(status.clean).toBe(false);
      expect(status.untracked).toContain("test.txt");
    });

    it("should detect modified files", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");
      await git.commit({ message: "Initial commit" });

      await fs.writeFile(path.join(tempDir, "test.txt"), "modified content");

      const status = await git.status();

      expect(status.clean).toBe(false);
      expect(status.modified).toContain("test.txt");
    });

    it("should detect staged files", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");

      const status = await git.status();

      expect(status.clean).toBe(false);
      expect(status.staged).toContain("test.txt");
    });
  });

  describe("add", () => {
    beforeEach(async () => {
      await git.init();
    });

    it("should add files to staging area", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");

      const result = await git.add("test.txt");

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.staged).toContain("test.txt");
    });

    it("should add multiple files", async () => {
      await fs.writeFile(path.join(tempDir, "test1.txt"), "content1");
      await fs.writeFile(path.join(tempDir, "test2.txt"), "content2");

      const result = await git.add(["test1.txt", "test2.txt"]);

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.staged).toContain("test1.txt");
      expect(status.staged).toContain("test2.txt");
    });

    it("should add all files with .", async () => {
      await fs.writeFile(path.join(tempDir, "test1.txt"), "content1");
      await fs.writeFile(path.join(tempDir, "test2.txt"), "content2");

      const result = await git.add(".");

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.staged).toContain("test1.txt");
      expect(status.staged).toContain("test2.txt");
    });
  });

  describe("commit", () => {
    beforeEach(async () => {
      await git.init();
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");
    });

    it("should create a commit", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");

      const result = await git.commit({ message: "Test commit" });

      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();

      const status = await git.status();
      expect(status.clean).toBe(true);
    });

    it("should commit all modified files with all option", async () => {
      await fs.writeFile(path.join(tempDir, "test1.txt"), "content1");
      await git.add("test1.txt");
      await git.commit({ message: "Initial" });

      await fs.writeFile(path.join(tempDir, "test1.txt"), "modified");
      await fs.writeFile(path.join(tempDir, "test2.txt"), "content2");

      const result = await git.commit({ message: "Commit all", all: true });

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.modified).toHaveLength(0);
    });
  });

  describe("branch", () => {
    beforeEach(async () => {
      await git.init();
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");
      await git.commit({ message: "Initial commit" });
    });

    it("should create a new branch", async () => {
      const result = await git.branch("feature");

      expect(result).toHaveProperty("success", true);
    });

    it("should list branches", async () => {
      await git.branch("feature");
      await git.branch("develop");

      const branches = await git.branch();

      expect(Array.isArray(branches)).toBe(true);
      if (Array.isArray(branches)) {
        const names = branches.map((b) => b.name);
        expect(names).toContain("feature");
        expect(names).toContain("develop");
      }
    });

    it("should delete a branch", async () => {
      await git.branch("temp");

      const result = await git.branch("temp", { delete: true });

      expect(result).toHaveProperty("success", true);

      const branches = await git.branch();
      if (Array.isArray(branches)) {
        const names = branches.map((b) => b.name);
        expect(names).not.toContain("temp");
      }
    });
  });

  describe("checkout", () => {
    beforeEach(async () => {
      await git.init();
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");
      await git.commit({ message: "Initial commit" });
    });

    it("should switch to existing branch", async () => {
      await git.branch("feature");

      const result = await git.checkout("feature");

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.branch).toBe("feature");
    });

    it("should create and switch to new branch", async () => {
      const result = await git.checkout("new-feature", { create: true });

      expect(result.success).toBe(true);

      const status = await git.status();
      expect(status.branch).toBe("new-feature");
    });
  });

  describe("log", () => {
    beforeEach(async () => {
      await git.init();
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");
    });

    it("should return commit history", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");
      await git.commit({ message: "First commit" });

      await fs.writeFile(path.join(tempDir, "test2.txt"), "content2");
      await git.add("test2.txt");
      await git.commit({ message: "Second commit" });

      const logs = await git.log();

      expect(logs).toHaveLength(2);
      expect(logs[0]?.message).toBe("Second commit");
      expect(logs[1]?.message).toBe("First commit");
    });

    it("should limit number of commits", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "content");
      await git.add("test.txt");
      await git.commit({ message: "First" });

      await fs.writeFile(path.join(tempDir, "test2.txt"), "content2");
      await git.add("test2.txt");
      await git.commit({ message: "Second" });

      await fs.writeFile(path.join(tempDir, "test3.txt"), "content3");
      await git.add("test3.txt");
      await git.commit({ message: "Third" });

      const logs = await git.log({ limit: 2 });

      expect(logs).toHaveLength(2);
    });
  });

  describe("diff", () => {
    beforeEach(async () => {
      await git.init();
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");
      await fs.writeFile(path.join(tempDir, "test.txt"), "original content");
      await git.add("test.txt");
      await git.commit({ message: "Initial commit" });
    });

    it("should show unstaged changes", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "modified content");

      const diff = await git.diff();

      expect(diff).toContain("original content");
      expect(diff).toContain("modified content");
    });

    it("should show staged changes", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "modified content");
      await git.add("test.txt");

      const diff = await git.diff({ staged: true });

      expect(diff).toContain("original content");
      expect(diff).toContain("modified content");
    });

    it("should show only file names when nameOnly is true", async () => {
      await fs.writeFile(path.join(tempDir, "test.txt"), "modified content");
      await fs.writeFile(path.join(tempDir, "new.txt"), "new file");

      const diff = await git.diff({ nameOnly: true });

      expect(diff).toContain("test.txt");
      expect(diff).not.toContain("modified content");
    });
  });

  describe("config", () => {
    beforeEach(async () => {
      await git.init();
    });

    it("should set and get config values", async () => {
      await git.config("user.email", "test@example.com");

      const email = await git.config("user.email");

      expect(email).toBe("test@example.com");
    });

    it("should list all config values", async () => {
      await git.config("user.email", "test@example.com");
      await git.config("user.name", "Test User");

      const config = await git.config(undefined, undefined, { list: true });

      expect(typeof config).toBe("object");
      if (typeof config === "object" && !("success" in config)) {
        expect(config["user.email"]).toBe("test@example.com");
        expect(config["user.name"]).toBe("Test User");
      }
    });
  });
});
