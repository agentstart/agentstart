import type { Sandbox } from "@e2b/code-interpreter";
import path from "pathe";
import type {
  Dirent,
  FileSystemAPI,
  FileSystemEvent,
  FileSystemEventType,
  WatchHandle,
  WatchOptions,
} from "@/sandbox/types/file-system";
import { DEFAULT_WORKING_DIRECTORY } from "./constants";

const GLOB_SPECIAL_CHARS_REGEX = /([.+^=!:${}()|[\]\\])/g;
const GLOB_DOUBLE_WILDCARD = /\*\*/g;
const GLOB_SINGLE_STAR = /\*/g;
const GLOB_SINGLE_WILDCARD = /\?/g;
const DOUBLE_WILDCARD_PLACEHOLDER = /__DOUBLE_WILDCARD__/g;

const escapeForRegex = (pattern: string): string =>
  pattern
    .replace(GLOB_DOUBLE_WILDCARD, "__DOUBLE_WILDCARD__")
    .replace(GLOB_SPECIAL_CHARS_REGEX, "\\$1")
    .replace(DOUBLE_WILDCARD_PLACEHOLDER, ".*")
    .replace(GLOB_SINGLE_STAR, "[^/]*")
    .replace(GLOB_SINGLE_WILDCARD, "[^/]");

const globToRegex = (pattern: string): RegExp =>
  new RegExp(`^${escapeForRegex(pattern)}$`);

/**
 * E2B Sandbox implementation of FileSystemAPI
 * Provides file system operations using E2B Sandbox native API
 * Automatically refreshes sandbox heartbeat on each operation
 */
export class FileSystem implements FileSystemAPI {
  private sandbox: Sandbox;
  private workingDirectory: string = DEFAULT_WORKING_DIRECTORY;
  private activeWatches = new Map<string, WatchHandleImpl>();
  private watchIdCounter = 0;
  private pathTypeCache = new Map<string, "dir" | "file">();

  constructor(
    sandbox: Sandbox,
    private readonly manager?: { keepAlive: () => Promise<void> | void },
  ) {
    this.sandbox = sandbox;
  }

  /**
   * Resolves a relative path to an absolute path
   */
  resolvePath(filePath: string): string {
    return path.join(this.workingDirectory, filePath);
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(dirPath);
    const results: Dirent[] = [];

    // Use E2B native list method
    const entries = await this.sandbox.files.list(absolutePath);

    for (const entry of entries) {
      const name = entry.name;
      const parentPath = absolutePath.startsWith(this.workingDirectory)
        ? absolutePath.slice(this.workingDirectory.length) || "/"
        : absolutePath;
      const relativePath = `${parentPath}/${name}`.replace(/\/+/g, "/");

      // Check if should ignore this directory
      if (options?.ignores?.includes(name)) {
        continue;
      }

      const dirent: Dirent = {
        name: name.startsWith(this.workingDirectory)
          ? name.slice(this.workingDirectory.length) || "/"
          : name,
        path: relativePath,
        parentPath,
        isFile: () => entry.type === "file",
        isDirectory: () => entry.type === "dir",
      };

      const entryAbsolutePath = `${absolutePath}/${name}`.replace(/\/+/g, "/");
      this.pathTypeCache.set(
        entryAbsolutePath,
        entry.type === "dir" ? "dir" : "file",
      );

      results.push(dirent);

      // If recursive and it's a directory, recursively read it
      if (options?.recursive && entry.type === "dir") {
        const subPath = `${absolutePath}/${name}`.replace(/\/+/g, "/");
        const subDirents = await this.readdir(
          subPath.replace(`${this.workingDirectory}/`, ""),
          options,
        );
        results.push(...subDirents);
      }
    }

    return results;
  }

  /**
   * Reads the contents of a file
   */
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
  ): Promise<string | Buffer>;
  async readFile(
    filePath: string,
    options?: {
      encoding?: BufferEncoding | null;
      binary?: boolean;
    },
  ): Promise<string | Buffer> {
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(filePath);

    try {
      const content = await this.sandbox.files.read(absolutePath);

      // E2B returns string content directly
      if (options?.binary || options?.encoding === null) {
        return Buffer.from(content, "base64");
      }

      return content;
    } catch (error) {
      // Enhance error message for common cases
      const err = error as { message?: string };
      if (
        err.message?.includes("not found") ||
        err.message?.includes("does not exist")
      ) {
        throw new Error(
          `ENOENT: no such file or directory, open '${absolutePath}'`,
        );
      }
      throw error;
    }
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(filePath);

    // Create parent directories if recursive option is true
    if (options?.recursive) {
      const dir = absolutePath.substring(0, absolutePath.lastIndexOf("/"));
      if (dir) {
        await this.sandbox.files.makeDir(dir);
      }
    }

    // Convert data to string for E2B
    let content: string;
    if (typeof data === "string") {
      content = data;
    } else if (data instanceof Buffer) {
      content = data.toString(options?.encoding || "utf8");
    } else {
      content = Buffer.from(data).toString(options?.encoding || "utf8");
    }

    // Write file using sandbox API
    await this.sandbox.files.write(absolutePath, content);
    this.pathTypeCache.set(absolutePath, "file");
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(dirPath);

    try {
      // E2B's makeDir automatically creates parent directories
      const created = await this.sandbox.files.makeDir(absolutePath);

      // If not recursive and directory already exists, throw error
      if (!options?.recursive && !created) {
        // Check if it exists
        const exists = await this.sandbox.files.exists(absolutePath);
        if (exists) {
          throw new Error(
            `EEXIST: file already exists, mkdir '${absolutePath}'`,
          );
        }
      }
      this.pathTypeCache.set(absolutePath, "dir");
    } catch (error) {
      const err = error as { message?: string };
      if (err.message?.includes("already exists")) {
        if (!options?.recursive) {
          throw new Error(
            `EEXIST: file already exists, mkdir '${absolutePath}'`,
          );
        }
      } else {
        throw error;
      }
    }
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(targetPath);

    try {
      // Check if exists first when not forcing
      if (!options?.force) {
        const exists = await this.sandbox.files.exists(absolutePath);
        if (!exists) {
          throw new Error(
            `ENOENT: no such file or directory, unlink '${absolutePath}'`,
          );
        }
      }

      // E2B's remove handles both files and directories
      await this.sandbox.files.remove(absolutePath);
      this.pathTypeCache.delete(absolutePath);
    } catch (error) {
      const err = error as { message?: string };
      if (!options?.force) {
        if (
          err.message?.includes("not found") ||
          err.message?.includes("does not exist")
        ) {
          throw new Error(
            `ENOENT: no such file or directory, unlink '${absolutePath}'`,
          );
        }
        throw error;
      }
      // If force is true, ignore errors
    }
  }

  /**
   * Renames or moves a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absoluteOldPath = this.resolvePath(oldPath);
    const absoluteNewPath = this.resolvePath(newPath);

    try {
      // Ensure the destination directory exists
      const destDir = absoluteNewPath.substring(
        0,
        absoluteNewPath.lastIndexOf("/"),
      );
      if (destDir) {
        await this.sandbox.files.makeDir(destDir);
      }

      // Use E2B's rename method
      await this.sandbox.files.rename(absoluteOldPath, absoluteNewPath);
      const cachedType = this.pathTypeCache.get(absoluteOldPath);
      if (cachedType) {
        this.pathTypeCache.delete(absoluteOldPath);
        this.pathTypeCache.set(absoluteNewPath, cachedType);
      }
    } catch (error) {
      const err = error as { message?: string };
      if (
        err.message?.includes("not found") ||
        err.message?.includes("does not exist")
      ) {
        throw new Error(
          `ENOENT: no such file or directory, rename '${absoluteOldPath}' -> '${absoluteNewPath}'`,
        );
      }
      throw error;
    }
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(filePath);

    try {
      // Use E2B's native getInfo method
      const info = await this.sandbox.files.getInfo(absolutePath);

      const isDirectory = info.type === "dir";
      const isFile = info.type === "file";
      const isSymlink = false; // E2B doesn't have symlink type

      // E2B returns timestamps as Date objects already
      const mtime = info.modifiedTime || new Date();
      const atime = info.modifiedTime || mtime;
      const ctime = info.modifiedTime || mtime;

      return {
        size: info.size || 0,
        mtime,
        ctime,
        atime,
        isFile: () => isFile,
        isDirectory: () => isDirectory,
        isSymbolicLink: () => isSymlink,
      };
    } catch (error) {
      const err = error as { message?: string };
      if (
        err.message?.includes("not found") ||
        err.message?.includes("does not exist")
      ) {
        throw new Error(
          `ENOENT: no such file or directory, stat '${absolutePath}'`,
        );
      }
      throw error;
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(path: string): Promise<boolean> {
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(path);

    try {
      // Use E2B's native exists method
      return await this.sandbox.files.exists(absolutePath);
    } catch {
      // If there's an error checking existence, return false
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
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    const cwd = options?.cwd
      ? this.resolvePath(options.cwd)
      : this.workingDirectory;

    const compiledPatterns = patterns.map(globToRegex);
    const matches = new Set<string>();
    const metadata = new Map<
      string,
      { fullPath: string; type: "file" | "dir" }
    >();

    // Recursive function to search directories
    const searchDirectory = async (
      dir: string,
      relativePath: string = "",
    ): Promise<void> => {
      try {
        await this.manager?.keepAlive();
        const entries = await this.sandbox.files.list(dir);

        for (const entry of entries) {
          const entryRelativePath = relativePath
            ? `${relativePath}/${entry.name}`.replace(/\/+/g, "/")
            : entry.name;
          const entryFullPath = `${dir}/${entry.name}`.replace(/\/+/g, "/");
          this.pathTypeCache.set(
            entryFullPath,
            entry.type === "dir" ? "dir" : "file",
          );
          metadata.set(entryRelativePath, {
            fullPath: entryFullPath,
            type: entry.type === "dir" ? "dir" : "file",
          });

          // Check if this entry matches any pattern
          if (compiledPatterns.some((regex) => regex.test(entryRelativePath))) {
            matches.add(entryRelativePath);
          }

          if (entry.type === "dir") {
            await this.manager?.keepAlive();
            await searchDirectory(entryFullPath, entryRelativePath);
          }
        }
      } catch {
        // Ignore errors for inaccessible directories
      }
    };

    // Start searching from cwd
    await searchDirectory(cwd);

    const excludeOption = options?.exclude;
    const excludeRegexes =
      Array.isArray(excludeOption) && excludeOption.length > 0
        ? excludeOption.map(globToRegex)
        : [];
    const excludeFn =
      typeof excludeOption === "function" ? excludeOption : undefined;

    const shouldExclude = (candidate: string): boolean => {
      if (!excludeOption) return false;
      if (excludeFn) return excludeFn(candidate);
      return excludeRegexes.some((regex) => regex.test(candidate));
    };

    // Apply exclude patterns
    const filteredMatches: string[] = [];
    for (const match of matches) {
      if (!shouldExclude(match)) {
        filteredMatches.push(match);
      }
    }

    const sortedMatches = filteredMatches.sort();

    // Return Dirent objects if withFileTypes is true
    if (options?.withFileTypes) {
      const dirents: Dirent[] = [];

      for (const match of sortedMatches) {
        const meta = metadata.get(match);
        if (!meta) continue;

        const relativePath = meta.fullPath.startsWith(this.workingDirectory)
          ? meta.fullPath.slice(this.workingDirectory.length) || "/"
          : meta.fullPath;
        const normalizedRelativeRaw = relativePath.replace(/\/+/g, "/");
        const normalizedRelative = normalizedRelativeRaw.startsWith("/")
          ? normalizedRelativeRaw || "/"
          : `/${normalizedRelativeRaw}`;
        const separatorIndex = normalizedRelative.lastIndexOf("/");
        const parentPath =
          separatorIndex <= 0
            ? "/"
            : normalizedRelative.slice(0, separatorIndex) || "/";
        const name =
          match.includes("/") && match.lastIndexOf("/") < match.length - 1
            ? match.slice(match.lastIndexOf("/") + 1)
            : match;

        dirents.push({
          name: name || normalizedRelative,
          path: normalizedRelative,
          parentPath,
          isFile: () => meta.type === "file",
          isDirectory: () => meta.type === "dir",
        });
      }

      return dirents;
    }

    return sortedMatches;
  }

  /**
   * Watches a directory for file system changes
   */
  async watch(
    path: string,
    callback: (event: FileSystemEvent) => void,
    options?: WatchOptions,
  ): Promise<WatchHandle> {
    // Auto-refresh heartbeat before operation
    await this.manager?.keepAlive();

    const absolutePath = this.resolvePath(path);
    const watchId = `watch-${++this.watchIdCounter}`;

    // Map E2B event types to our FileSystemEventType
    const mapEventType = (e2bType: string): FileSystemEventType | null => {
      switch (e2bType) {
        case "create":
          return "create";
        case "write":
        case "modify":
          return "modify";
        case "remove":
          return "delete";
        case "rename":
          return "move";
        default:
          return null;
      }
    };

    const ignoreRegexes =
      options?.ignore?.map((pattern) => globToRegex(pattern)) ?? [];

    // Check if path should be ignored
    const shouldIgnore = (filePath: string): boolean => {
      if (ignoreRegexes.length === 0) return false;

      const relativePath = filePath.startsWith(absolutePath)
        ? filePath.slice(absolutePath.length).replace(/^\//, "")
        : filePath;

      return ignoreRegexes.some((regex) => regex.test(relativePath));
    };

    let debounceTimer: NodeJS.Timeout | null = null;
    const debounceMs = options?.debounceMs || 100;
    const eventQueue: FileSystemEvent[] = [];

    const flushEvents = () => {
      const events = [...eventQueue];
      eventQueue.length = 0;
      for (const event of events) {
        void this.manager?.keepAlive();
        callback(event);
      }
    };

    const handleEvent = (event: FileSystemEvent) => {
      if (debounceMs > 0) {
        eventQueue.push(event);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushEvents, debounceMs);
      } else {
        void this.manager?.keepAlive();
        callback(event);
      }
    };

    try {
      // Use E2B's watchDir API
      const e2bHandle = await this.sandbox.files.watchDir(
        absolutePath,
        async (e2bEvent) => {
          // E2B event structure might vary, handle gracefully
          let eventPath = e2bEvent.name || absolutePath;
          if (!eventPath.startsWith("/")) {
            eventPath = this.resolvePath(eventPath);
          }

          // Filter out ignored paths
          if (shouldIgnore(eventPath)) {
            return;
          }

          const eventType = mapEventType(e2bEvent.type || "modify");
          if (!eventType) return;

          // Check if it's a directory
          let isDirectory: boolean;
          if (typeof (e2bEvent as { isDir?: boolean }).isDir === "boolean") {
            isDirectory = Boolean((e2bEvent as { isDir?: boolean }).isDir);
            this.pathTypeCache.set(eventPath, isDirectory ? "dir" : "file");
          } else {
            const cachedType = this.pathTypeCache.get(eventPath);
            if (cachedType) {
              isDirectory = cachedType === "dir";
            } else {
              try {
                const info = await this.sandbox.files.getInfo(eventPath);
                isDirectory = info.type === "dir";
                this.pathTypeCache.set(eventPath, isDirectory ? "dir" : "file");
              } catch {
                // File might have been deleted, assume it was a file
                isDirectory = false;
                this.pathTypeCache.delete(eventPath);
              }
            }
          }

          const fsEvent: FileSystemEvent = {
            type: eventType,
            path: eventPath.startsWith(this.workingDirectory)
              ? eventPath.slice(this.workingDirectory.length) || "/"
              : eventPath,
            isDirectory: isDirectory,
            timestamp: Date.now(),
          };

          if (eventType === "delete") {
            this.pathTypeCache.delete(eventPath);
          } else if (eventType === "move") {
            this.pathTypeCache.delete(eventPath);
          } else {
            this.pathTypeCache.set(eventPath, isDirectory ? "dir" : "file");
          }

          handleEvent(fsEvent);
        },
        {
          recursive: options?.recursive,
        },
      );

      // Create the watch handle
      const handle = new WatchHandleImpl(
        watchId,
        absolutePath,
        e2bHandle,
        () => {
          // Cleanup
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            flushEvents(); // Flush any pending events
          }
          this.activeWatches.delete(watchId);
        },
      );

      this.activeWatches.set(watchId, handle);

      // Perform initial scan if requested
      if (options?.initialScan) {
        await this.performInitialScan(absolutePath, callback, options);
      }

      return handle;
    } catch (error) {
      throw new Error(`Failed to watch directory: ${error}`);
    }
  }

  /**
   * Performs an initial scan of the directory
   */
  private async performInitialScan(
    filePath: string,
    callback: (event: FileSystemEvent) => void,
    options?: WatchOptions,
  ): Promise<void> {
    await this.manager?.keepAlive();

    try {
      const entries = await this.readdir(filePath, {
        recursive: options?.recursive,
      });

      const initialIgnoreRegexes =
        options?.ignore?.map((pattern) => globToRegex(pattern)) ?? [];

      for (const entry of entries) {
        const fullPath = `${entry.parentPath}/${entry.name}`.replace(
          /\/+/g,
          "/",
        );
        const absoluteEntryPath = path.join(
          this.workingDirectory,
          fullPath.replace(/^\//, ""),
        );
        this.pathTypeCache.set(
          absoluteEntryPath,
          entry.isDirectory() ? "dir" : "file",
        );

        // Check if should ignore
        if (initialIgnoreRegexes.length > 0) {
          const relativePath = absoluteEntryPath.startsWith(filePath)
            ? absoluteEntryPath.slice(filePath.length).replace(/^\//, "")
            : fullPath.replace(/^\//, "");
          const shouldIgnore = initialIgnoreRegexes.some((regex) =>
            regex.test(relativePath),
          );

          if (shouldIgnore) continue;
        }

        callback({
          type: "create",
          path: fullPath,
          isDirectory: entry.isDirectory(),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // Directory might not exist, ignore error for initial scan
      console.warn(`Initial scan failed for ${filePath}:`, error);
    }
  }

  /**
   * Stop all active watches (cleanup method)
   */
  async stopAllWatches(): Promise<void> {
    const handles = Array.from(this.activeWatches.values());
    await Promise.all(handles.map((handle) => handle.stop()));
    this.activeWatches.clear();
  }
}

/**
 * Implementation of WatchHandle
 */
class WatchHandleImpl implements WatchHandle {
  constructor(
    public readonly id: string,
    public readonly path: string,
    private e2bHandle: { stop: () => Promise<void> } | undefined,
    private onStop: () => void,
  ) {}

  private active = true;

  async stop(): Promise<void> {
    if (!this.active) return;

    this.active = false;

    // Stop the E2B watch
    if (this.e2bHandle && typeof this.e2bHandle.stop === "function") {
      await this.e2bHandle.stop();
    }

    // Call cleanup
    this.onStop();
  }

  isActive(): boolean {
    return this.active;
  }
}
