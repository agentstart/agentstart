import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileSystem } from "@/sandbox/adapter/nodejs/file-system";
import type { Dirent } from "@/sandbox/types/file-system";

describe("FileSystem", () => {
  let fileSystem: FileSystem;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fs-test-"));
    fileSystem = new FileSystem(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("resolvePath", () => {
    it("should resolve relative paths to absolute paths", () => {
      const result = fileSystem.resolvePath("./test.txt");
      expect(result).toBe(path.join(tempDir, "test.txt"));
    });

    it("should return absolute paths unchanged", () => {
      const absolutePath = "/usr/local/bin";
      const result = fileSystem.resolvePath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe("writeFile and readFile", () => {
    it("should write and read text files", async () => {
      const filePath = "test.txt";
      const content = "Hello, World!";

      await fileSystem.writeFile(filePath, content);
      const result = await fileSystem.readFile(filePath, { encoding: "utf8" });

      expect(result).toBe(content);
    });

    it("should write and read binary files", async () => {
      const filePath = "test.bin";
      const content = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

      await fileSystem.writeFile(filePath, content);
      const result = await fileSystem.readFile(filePath, { binary: true });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(content);
    });

    it("should create parent directories when recursive option is true", async () => {
      const filePath = "nested/deep/test.txt";
      const content = "Nested content";

      await fileSystem.writeFile(filePath, content, { recursive: true });
      const result = await fileSystem.readFile(filePath, { encoding: "utf8" });

      expect(result).toBe(content);
    });
  });

  describe("mkdir", () => {
    it("should create a directory", async () => {
      const dirPath = "test-dir";

      await fileSystem.mkdir(dirPath);

      const absolutePath = fileSystem.resolvePath(dirPath);
      const stats = await fs.stat(absolutePath);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create nested directories with recursive option", async () => {
      const dirPath = "parent/child/grandchild";

      await fileSystem.mkdir(dirPath, { recursive: true });

      const absolutePath = fileSystem.resolvePath(dirPath);
      const stats = await fs.stat(absolutePath);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("readdir", () => {
    beforeEach(async () => {
      await fileSystem.writeFile("file1.txt", "content1");
      await fileSystem.writeFile("file2.txt", "content2");
      await fileSystem.mkdir("subdir");
      await fileSystem.writeFile("subdir/file3.txt", "content3");
    });

    it("should read directory contents", async () => {
      const entries = await fileSystem.readdir(".");

      expect(entries).toHaveLength(3);
      const names = entries.map((e) => e.name).sort();
      expect(names).toEqual(["file1.txt", "file2.txt", "subdir"]);
    });

    it("should read all directory contents (recursive by default)", async () => {
      const entries = await fileSystem.readdir(".");

      // With fast-glob, readdir now returns all files recursively by default
      expect(entries.length).toBeGreaterThanOrEqual(3);
      const names = entries.map((e) => e.name);
      expect(names).toContain("file1.txt");
      expect(names).toContain("file2.txt");
      expect(names).toContain("subdir/file3.txt");
    });

    it("should ignore specified directories", async () => {
      const entries = await fileSystem.readdir(".", {
        ignores: ["subdir/**"],
      });

      const names = entries.map((e) => e.name);
      expect(names).toContain("file1.txt");
      expect(names).toContain("file2.txt");
      expect(names).toContain("subdir");
      expect(names).not.toContain("subdir/file3.txt");
    });
  });

  describe("rm", () => {
    it("should remove a file", async () => {
      const filePath = "test.txt";
      await fileSystem.writeFile(filePath, "content");

      await fileSystem.rm(filePath);

      const absolutePath = fileSystem.resolvePath(filePath);
      await expect(fs.access(absolutePath)).rejects.toThrow();
    });

    it("should remove a directory recursively", async () => {
      const dirPath = "test-dir";
      await fileSystem.mkdir(dirPath);
      await fileSystem.writeFile(`${dirPath}/file.txt`, "content");

      await fileSystem.rm(dirPath, { recursive: true });

      const absolutePath = fileSystem.resolvePath(dirPath);
      await expect(fs.access(absolutePath)).rejects.toThrow();
    });

    it("should not throw with force option when file does not exist", async () => {
      await expect(
        fileSystem.rm("non-existent", { force: true }),
      ).resolves.toBeUndefined();
    });
  });

  describe("rename", () => {
    it("should rename a file", async () => {
      const oldPath = "old.txt";
      const newPath = "new.txt";
      const content = "test content";

      await fileSystem.writeFile(oldPath, content);
      await fileSystem.rename(oldPath, newPath);

      const result = await fileSystem.readFile(newPath, { encoding: "utf8" });
      expect(result).toBe(content);

      const oldAbsolutePath = fileSystem.resolvePath(oldPath);
      await expect(fs.access(oldAbsolutePath)).rejects.toThrow();
    });

    it("should move a file to a different directory", async () => {
      const oldPath = "file.txt";
      const newPath = "subdir/moved.txt";
      const content = "test content";

      await fileSystem.writeFile(oldPath, content);
      await fileSystem.rename(oldPath, newPath);

      const result = await fileSystem.readFile(newPath, { encoding: "utf8" });
      expect(result).toBe(content);
    });
  });

  describe("glob", () => {
    beforeEach(async () => {
      await fileSystem.writeFile("test.js", "js content");
      await fileSystem.writeFile("test.ts", "ts content");
      await fileSystem.writeFile("app.js", "app js");
      await fileSystem.mkdir("src");
      await fileSystem.writeFile("src/index.js", "index js");
      await fileSystem.writeFile("src/index.ts", "index ts");
    });

    it("should find files matching a simple pattern", async () => {
      const matches = await fileSystem.glob("*.js");

      expect(matches).toHaveLength(2);
      expect(matches).toContain("app.js");
      expect(matches).toContain("test.js");
    });

    it("should find files matching multiple patterns", async () => {
      const matches = await fileSystem.glob(["*.js", "*.ts"]);

      expect(matches).toHaveLength(3);
      expect(matches).toContain("app.js");
      expect(matches).toContain("test.js");
      expect(matches).toContain("test.ts");
    });

    it("should find files recursively", async () => {
      const matches = await fileSystem.glob("**/*.js");

      expect(matches).toHaveLength(3);
      expect(matches).toContain("app.js");
      expect(matches).toContain("test.js");
      expect(matches).toContain("src/index.js");
    });

    it("should exclude files using a function", async () => {
      const matches = await fileSystem.glob("**/*.js", {
        exclude: (path) => path.includes("test"),
      });

      expect(matches).toHaveLength(2);
      expect(matches).toContain("app.js");
      expect(matches).toContain("src/index.js");
    });

    it("should exclude files using patterns", async () => {
      const matches = await fileSystem.glob("**/*.js", {
        exclude: ["test.*"],
      });

      expect(matches).toHaveLength(2);
      expect(matches).toContain("app.js");
      expect(matches).toContain("src/index.js");
    });

    it("should return Dirent objects when withFileTypes is true", async () => {
      const matches = await fileSystem.glob("*.js", { withFileTypes: true });

      expect(matches).toHaveLength(2);
      expect(matches[0] as Dirent).toHaveProperty("name");
      expect(matches[0] as Dirent).toHaveProperty("isFile");
      expect(matches[0] as Dirent).toHaveProperty("isDirectory");
      expect((matches[0] as Dirent).isFile()).toBe(true);
    });
  });
});
