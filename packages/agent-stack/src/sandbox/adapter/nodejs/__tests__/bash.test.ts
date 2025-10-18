import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Bash } from "@/sandbox/adapter/nodejs/bash";

describe("Bash", () => {
  let bash: Bash;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bash-test-"));
    bash = new Bash(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("$ - Shell command execution", () => {
    it("should execute simple commands", async () => {
      const result = await bash.$`printf "Hello World"`;

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("Hello World");
    });

    it("should handle command failure", async () => {
      const result = await bash.$`exit 1`;

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });

    it("should support piping commands", async () => {
      const result = await bash.$`bash -lc "printf 'hello\nworld\n' | wc -l"`;

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("2");
    });

    it("should interpolate values in template literals", async () => {
      const name = "World";
      const result = await bash.$`echo "Hello ${name}"`;

      expect(result.stdout.trim()).toBe("Hello World");
    });

    it("should execute commands with custom cwd", async () => {
      const result = await bash.$({ cwd: tempDir })`pwd`;

      // On macOS, /var is a symlink to /private/var
      const expectedPath = result.stdout.trim().replace(/^\/private/, "");
      const actualPath = tempDir.replace(/^\/private/, "");
      expect(expectedPath).toBe(actualPath);
    });

    it("should handle environment variables", async () => {
      const result = await bash.$({
        env: { TEST_VAR: "test_value" },
      })`printf "$TEST_VAR"`;

      expect(result.stdout).toBe("test_value");
    });

    it("should respect timeout option", async () => {
      const promise = bash.$({ timeout: 100 })`sleep 5`;

      await expect(promise).rejects.toThrow();
    });

    it("should preserve surrounding whitespace by default", async () => {
      const result = await bash.$`printf "  Hello  "`;

      expect(result.stdout).toBe("  Hello  ");
    });

    it("should keep trailing newline by default", async () => {
      const result = await bash.$`echo "Hello"`;

      expect(result.stdout).toBe("Hello\n");
    });
  });

  describe("grep - File content search", () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, "test1.txt"),
        "Hello World\nThis is a test\nHello again",
      );
      await fs.writeFile(
        path.join(tempDir, "test2.txt"),
        "Another file\nWith some content\nHello there",
      );
      await fs.writeFile(
        path.join(tempDir, "test.js"),
        'function hello() {\n  console.log("Hello");\n}',
      );
      await fs.mkdir(path.join(tempDir, "subdir"));
      await fs.writeFile(
        path.join(tempDir, "subdir/test3.txt"),
        "Nested file\nHello nested",
      );
    });

    it("should find pattern in files", async () => {
      const result = await bash.grep("Hello", { path: tempDir });

      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.files.some((f) => f.filename === "test1.txt")).toBe(true);
    });

    it("should support case-insensitive search", async () => {
      const result = await bash.grep("hello", {
        path: tempDir,
        ignoreCase: true,
      });

      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.files.some((f) => f.filename === "test1.txt")).toBe(true);
    });

    it("should show line numbers when requested", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        showLineNumbers: true,
      });

      const file = result.files.find((f) => f.filename === "test1.txt");
      expect(file).toBeDefined();
      expect(file?.matches?.[0]?.lineNumber).toBe(1);
      expect(file?.matches?.[1]?.lineNumber).toBe(3);
    });

    it("should show only filenames when showFilesOnly is true", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        showFilesOnly: true,
      });

      expect(result.files[0]?.matches).toBeUndefined();
      expect(result.files[0]?.filename).toBeDefined();
    });

    it("should include specific file types", async () => {
      const result = await bash.grep("hello", {
        path: tempDir,
        include: "*.js",
        ignoreCase: true,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe("test.js");
    });

    it("should exclude specific patterns", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        exclude: ["*.js"],
      });

      expect(result.files.every((f) => !f.filename.endsWith(".js"))).toBe(true);
    });

    it("should search recursively by default", async () => {
      const result = await bash.grep("Hello", { path: tempDir });

      expect(result.files.some((f) => f.filename === "subdir/test3.txt")).toBe(
        true,
      );
    });

    it("should not search recursively when recursive is false", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        recursive: false,
      });

      expect(result.files.every((f) => !f.filename.includes("/"))).toBe(true);
    });

    it("should match whole words only when requested", async () => {
      const result = await bash.grep("test", {
        path: tempDir,
        wholeWord: true,
      });

      const file = result.files.find((f) => f.filename === "test1.txt");
      expect(file?.matches).toHaveLength(1);
    });

    it("should show context lines when requested", async () => {
      const result = await bash.grep("test", {
        path: tempDir,
        context: 1,
      });

      const file = result.files.find((f) => f.filename === "test1.txt");
      expect(file).toBeDefined();
      expect(file?.matchCount ?? 0).toBeGreaterThan(0);
    });

    it("should limit maximum results", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        maxResults: 2,
      });

      const totalMatches = result.files.reduce(
        (sum, f) => sum + (f.matchCount || 0),
        0,
      );
      expect(totalMatches).toBeLessThanOrEqual(2);
    });

    it("should sort by modification time when requested", async () => {
      const result = await bash.grep("Hello", {
        path: tempDir,
        sortByTime: true,
      });

      if (result.files.length > 1) {
        const times = result.files.map((f) => f.modifiedTime || 0);
        for (let i = 1; i < times.length; i++) {
          expect(times[i - 1] ?? 0).toBeGreaterThanOrEqual(times[i] ?? 0);
        }
      }
    });

    it("should highlight match positions", async () => {
      const result = await bash.grep("Hello", { path: tempDir });

      const file = result.files.find((f) => f.filename === "test1.txt");
      const match = file?.matches?.[0];
      expect(match?.highlights).toBeDefined();
      expect(match?.highlights?.[0]).toHaveProperty("start");
      expect(match?.highlights?.[0]).toHaveProperty("end");
    });
  });
});
