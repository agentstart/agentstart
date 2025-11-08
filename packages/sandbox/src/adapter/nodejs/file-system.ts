/* agent-frontmatter:start
AGENT: Node.js sandbox file-system adapter
PURPOSE: Provide sandbox-safe file system operations for the local Node.js runtime
USAGE: Instantiate with a workspace directory to read, write, and watch files under that root
EXPORTS: FileSystem
FEATURES:
  - Resolves and validates workspace-relative paths
  - Implements typed glob, read, write, and watch helpers
  - Mirrors shared FileSystemAPI contract
SEARCHABLE: nodejs sandbox filesystem, file operations adapter, glob and watch implementation
agent-frontmatter:end */

import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  Dirent,
  FileSystemAPI,
  FileSystemEvent,
  WatchHandle,
  WatchOptions,
} from "@agentstart/types";
import chokidar from "chokidar";
import fg, { type Entry } from "fast-glob";
import { nanoid } from "nanoid";

/**
 * Node.js implementation of FileSystemAPI
 * Provides file system operations using Node.js fs module
 */
export class FileSystem implements FileSystemAPI {
  private workingDirectory: string;
  private normalizedWorkingDirectory: string;

  constructor(workingDirectory?: string) {
    this.workingDirectory = path.resolve(workingDirectory || process.cwd());
    this.normalizedWorkingDirectory = this.normalizeSeparator(
      this.workingDirectory,
    );
  }

  /**
   * Resolves a relative path to an absolute path
   * All paths are resolved relative to the workspace directory for security
   */
  resolvePath(filePath: string): string {
    const trimmedInput = filePath.trim();
    if (!trimmedInput || trimmedInput === "." || trimmedInput === "./") {
      return this.workingDirectory;
    }

    const normalizedWorkspace = path.normalize(this.workingDirectory);
    const normalizedInput = path.normalize(trimmedInput);

    // Treat "/" as workspace root for sandbox isolation
    if (normalizedInput === path.sep) {
      return normalizedWorkspace;
    }

    // Resolve all paths (absolute or relative) against workspace
    // This prevents absolute paths from escaping the sandbox
    const candidate = path.isAbsolute(normalizedInput)
      ? normalizedInput
      : path.resolve(normalizedWorkspace, normalizedInput);
    const normalizedCandidate = path.normalize(candidate);

    // Verify the resolved path is within workspace
    const isWithinWorkspace =
      normalizedCandidate === normalizedWorkspace ||
      normalizedCandidate.startsWith(`${normalizedWorkspace}${path.sep}`);

    if (!isWithinWorkspace) {
      throw new Error(
        `Path '${filePath}' is outside the sandbox workspace '${normalizedWorkspace}'`,
      );
    }

    return normalizedCandidate;
  }

  private normalizeSeparator(targetPath: string): string {
    return targetPath.replace(/\\+/g, "/");
  }

  private toWorkspacePath(targetPath: string): string {
    const absolutePath = path.isAbsolute(targetPath)
      ? targetPath
      : path.join(this.workingDirectory, targetPath);
    const normalizedTarget = this.normalizeSeparator(
      path.resolve(absolutePath),
    );

    if (normalizedTarget === this.normalizedWorkingDirectory) {
      return "/";
    }

    const prefix = `${this.normalizedWorkingDirectory}/`;
    if (normalizedTarget.startsWith(prefix)) {
      const relative = normalizedTarget.slice(prefix.length);
      return relative || "/";
    }

    return normalizedTarget;
  }

  private normalizeForMatch(targetPath: string): string {
    const normalized = this.normalizeSeparator(targetPath);
    if (normalized.startsWith("./")) {
      return normalized.slice(2);
    }
    return normalized;
  }

  private globToRegExp(pattern: string): RegExp {
    const normalized = this.normalizeForMatch(pattern);
    let regex = "";
    for (let index = 0; index < normalized.length; index++) {
      const char = normalized[index];
      const next = normalized[index + 1];
      if (char === "*") {
        if (next === "*") {
          regex += ".*";
          index += 1;
          continue;
        }
        regex += "[^/]*";
        continue;
      }
      if (char === "?") {
        regex += "[^/]";
        continue;
      }
      if (char && "\\.^$+()[]{}|".includes(char)) {
        regex += `\\${char}`;
        continue;
      }
      regex += char;
    }
    return new RegExp(`^${regex}$`);
  }

  private compileIgnoreGlobs(patterns?: string[]): RegExp[] {
    if (!patterns?.length) {
      return [];
    }
    return patterns.map((pattern) => this.globToRegExp(pattern));
  }

  private isIgnored(inputPath: string, rules: RegExp[]): boolean {
    if (!rules.length) {
      return false;
    }
    const normalized = this.normalizeForMatch(inputPath);
    return rules.some((rule) => rule.test(normalized));
  }

  /**
   * Reads the contents of a directory
   */
  async readdir(
    dirPath: string,
    options?: {
      recursive?: boolean;
      ignores?: string[];
    },
  ): Promise<Dirent[]> {
    const absolutePath = this.resolvePath(dirPath);
    const pattern = options?.recursive === false ? "*" : "**/*";
    const ignoreRules = this.compileIgnoreGlobs(options?.ignores);
    const entries = await fg(pattern, {
      cwd: absolutePath,
      dot: true,
      onlyFiles: false,
      unique: true,
      objectMode: true,
    });

    const results: Dirent[] = [];
    const seenPaths = new Set<string>();

    for (const entry of entries as Entry[]) {
      const entryAbsolutePath = path.join(absolutePath, entry.path);
      const relativePath = this.toWorkspacePath(entryAbsolutePath);
      const parentPath = this.toWorkspacePath(path.dirname(entryAbsolutePath));

      if (this.isIgnored(relativePath, ignoreRules)) {
        continue;
      }

      if (seenPaths.has(relativePath)) {
        continue;
      }
      seenPaths.add(relativePath);

      const entryName = this.normalizeForMatch(entry.path) || entry.name;

      results.push({
        name: entryName,
        path: relativePath,
        parentPath,
        isFile: () => entry.dirent.isFile(),
        isDirectory: () => entry.dirent.isDirectory(),
      });
    }

    return results;
  }

  /**
   * Reads the contents of a file
   */
  async readFile(filePath: string): Promise<string>;
  async readFile(
    filePath: string,
    options: {
      encoding: BufferEncoding;
      binary?: false;
    },
  ): Promise<string>;
  async readFile(
    filePath: string,
    options: {
      encoding: null;
      binary?: boolean;
    },
  ): Promise<Buffer>;
  async readFile(
    filePath: string,
    options: {
      encoding?: BufferEncoding | null;
      binary: true;
    },
  ): Promise<Buffer>;
  async readFile(
    filePath: string,
    options?: {
      encoding?: BufferEncoding | null;
      binary?: boolean;
    },
  ): Promise<string | Buffer> {
    const absolutePath = this.resolvePath(filePath);

    if (options?.binary || options?.encoding === null) {
      return fs.readFile(absolutePath);
    }

    if (options?.encoding) {
      return fs.readFile(absolutePath, { encoding: options.encoding });
    }

    return fs.readFile(absolutePath, { encoding: "utf8" });
  }

  /**
   * Writes data to a file
   */
  async writeFile(
    filePath: string,
    data: string | Uint8Array | Buffer,
    options?: {
      encoding?: BufferEncoding | null;
      recursive?: boolean;
    } | null,
  ): Promise<void> {
    const absolutePath = this.resolvePath(filePath);

    // Create parent directories if recursive option is true
    if (options?.recursive) {
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
    }

    if (typeof data === "string") {
      await fs.writeFile(absolutePath, data, {
        encoding: options?.encoding || "utf8",
      });
    } else {
      await fs.writeFile(absolutePath, data);
    }
  }

  /**
   * Creates a directory
   */
  async mkdir(
    dirPath: string,
    options?: {
      recursive: boolean;
    },
  ): Promise<void> {
    const absolutePath = this.resolvePath(dirPath);
    await fs.mkdir(absolutePath, {
      recursive: options?.recursive || false,
    });
  }

  /**
   * Removes a file or directory
   */
  async rm(
    targetPath: string,
    options?: {
      force?: boolean;
      recursive?: boolean;
    },
  ): Promise<void> {
    const absolutePath = this.resolvePath(targetPath);

    try {
      await fs.rm(absolutePath, {
        force: options?.force || false,
        recursive: options?.recursive || false,
      });
    } catch (error) {
      if (
        !options?.force ||
        (error as NodeJS.ErrnoException).code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  /**
   * Renames or moves a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const absoluteOldPath = this.resolvePath(oldPath);
    const absoluteNewPath = this.resolvePath(newPath);

    // Ensure the destination directory exists
    const destDir = path.dirname(absoluteNewPath);
    await fs.mkdir(destDir, { recursive: true });

    await fs.rename(absoluteOldPath, absoluteNewPath);
  }

  /**
   * Gets file or directory statistics
   */
  async stat(filePath: string): Promise<{
    size: number;
    mtime: Date;
    ctime: Date;
    atime: Date;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  }> {
    const absolutePath = this.resolvePath(filePath);
    const stats = await fs.stat(absolutePath);

    return {
      size: stats.size,
      mtime: stats.mtime,
      ctime: stats.ctime,
      atime: stats.atime,
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      isSymbolicLink: () => stats.isSymbolicLink(),
    };
  }

  /**
   * Checks whether a path exists in the sandbox workspace.
   */
  async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(targetPath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Finds files matching glob patterns
   */
  async glob(
    pattern: string | string[],
    options?: {
      cwd?: string;
      exclude?: ((path: string) => boolean) | string[];
      withFileTypes?: boolean;
    },
  ): Promise<string[] | Dirent[]> {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const cwd = options?.cwd
      ? this.resolvePath(options.cwd)
      : this.workingDirectory;

    let ignore: string[] | undefined;
    if (Array.isArray(options?.exclude)) {
      ignore = options.exclude;
    }

    const matches = new Set<string>();

    for (const pat of patterns) {
      const found = await fg(pat, {
        cwd,
        dot: true,
        onlyFiles: true,
        unique: true,
        ignore,
        absolute: false,
      });

      for (const match of found) {
        const normalizedMatch = this.normalizeSeparator(match);
        if (options?.exclude && typeof options.exclude === "function") {
          if (options.exclude(normalizedMatch)) {
            continue;
          }
        }

        matches.add(normalizedMatch);
      }
    }

    const sortedMatches = Array.from(matches).sort();

    if (options?.withFileTypes) {
      const dirents: Dirent[] = [];
      for (const relative of sortedMatches) {
        const absolutePath = path.join(cwd, relative);
        try {
          const stat = await fs.stat(absolutePath);
          const parentDir = path.dirname(relative);

          dirents.push({
            name: path.basename(relative),
            path: relative,
            parentPath: parentDir === "." ? "" : parentDir,
            isFile: () => stat.isFile(),
            isDirectory: () => stat.isDirectory(),
          });
        } catch {
          // Skip entries removed between globbing and stat lookup
        }
      }
      return dirents;
    }

    return sortedMatches;
  }

  /**
   * Watches a directory for file system changes
   * NOTE: This is a stub implementation for Node.js adapter.
   * Real implementation would use fs.watch or chokidar.
   */
  async watch(
    targetPath: string,
    callback: (event: FileSystemEvent) => void,
    options?: WatchOptions,
  ): Promise<WatchHandle> {
    const absoluteTarget = this.resolvePath(targetPath);
    const watchId = nanoid();

    const debounceMs = options?.debounceMs ?? 100;
    let pendingEvents: FileSystemEvent[] = [];
    let debounceTimer: NodeJS.Timeout | null = null;
    let active = true;
    const flushEvents = (): void => {
      if (!pendingEvents.length) {
        return;
      }

      const events = pendingEvents;
      pendingEvents = [];
      events.forEach((event) => {
        if (active) {
          callback(event);
        }
      });
    };

    const enqueueEvent = (event: FileSystemEvent): void => {
      if (!active) {
        return;
      }

      if (debounceMs <= 0) {
        callback(event);
        return;
      }

      pendingEvents.push(event);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushEvents();
      }, debounceMs);
    };

    const toEvent = (
      type: FileSystemEvent["type"],
      filePath: string,
      isDirectory: boolean,
    ): FileSystemEvent => ({
      type,
      path: this.toWorkspacePath(filePath),
      isDirectory,
      timestamp: Date.now(),
    });

    const watcher = chokidar.watch(absoluteTarget, {
      persistent: true,
      ignoreInitial: !(options?.initialScan ?? false),
      ignored: options?.ignore,
      depth: options?.recursive === false ? 0 : undefined,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10,
      },
    });

    watcher
      .on("add", (filepath: string) => {
        enqueueEvent(toEvent("create", filepath, false));
      })
      .on("addDir", (filepath: string) => {
        enqueueEvent(toEvent("create", filepath, true));
      })
      .on("change", (filepath: string) => {
        enqueueEvent(toEvent("modify", filepath, false));
      })
      .on("unlink", (filepath: string) => {
        enqueueEvent(toEvent("delete", filepath, false));
      })
      .on("unlinkDir", (filepath: string) => {
        enqueueEvent(toEvent("delete", filepath, true));
      })
      .on("error", (error: unknown) => {
        console.warn(`File watch error for ${absoluteTarget}:`, error);
      });

    await once(watcher, "ready");

    const stop = async (): Promise<void> => {
      if (!active) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
        flushEvents();
      }

      active = false;

      await watcher.close();
    };

    return {
      id: watchId,
      path: targetPath,
      stop,
      isActive: () => active,
    };
  }
}
