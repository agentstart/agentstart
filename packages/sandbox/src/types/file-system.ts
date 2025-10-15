/* agent-frontmatter:start
AGENT: Sandbox file system typing
PURPOSE: Describe sandbox-safe file system interfaces for file operations
USAGE: Import to type sandbox file reads, writes, and watchers
EXPORTS: Dirent, FileSystemAPI, FileSystemEventType, FileSystemEvent, WatchOptions, WatchHandle
FEATURES:
  - Provides typed async file helpers
  - Includes globbing and watch support
  - Mirrors sandbox runtime capabilities
SEARCHABLE: sandbox fs api, file operations typing, glob watch interfaces
agent-frontmatter:end */

/**
 * Sandbox representation of a Node.js-style directory entry.
 */
export interface Dirent {
  /** The name of the file or directory */
  name: string;
  /** The relative path of the entry */
  path: string;
  /** The path of the parent directory */
  parentPath: string;
  /** Check if this entry is a file */
  isFile(): boolean;
  /** Check if this entry is a directory */
  isDirectory(): boolean;
}

/**
 * Sandbox-aware file system helpers mirroring the runtime FileSystem API.
 */
export interface FileSystemAPI {
  /**
   * Resolve a provided path relative to the sandbox workspace.
   */
  resolvePath(path: string): string;

  /**
   * Read directory entries with optional recursion and ignore rules.
   */
  readdir(
    path: string,
    options?: {
      recursive?: boolean;
      ignores?: string[];
    },
  ): Promise<Dirent[]>;

  /**
   * Read file contents, returning either text or binary data.
   */
  readFile(
    path: string,
    options: {
      encoding: BufferEncoding;
      binary?: false;
    },
  ): Promise<string>;
  readFile(
    path: string,
    options: {
      encoding: null;
      binary?: boolean;
    },
  ): Promise<Buffer>;
  readFile(
    path: string,
    options: {
      encoding?: BufferEncoding | null;
      binary: true;
    },
  ): Promise<Buffer>;
  readFile(
    path: string,
    options?: {
      encoding?: BufferEncoding | null;
      binary?: boolean;
    },
  ): Promise<string | Buffer>;

  /**
   * Write data to a path, creating parents when requested.
   */
  writeFile(
    path: string,
    data: string | Uint8Array | Buffer,
    options?: {
      encoding?: BufferEncoding | null;
      recursive?: boolean;
    } | null,
  ): Promise<void>;

  /**
   * Create a directory, optionally building parent segments recursively.
   */
  mkdir(
    path: string,
    options?: {
      recursive: boolean;
    },
  ): Promise<void>;

  /**
   * Remove files or directories with optional recursion and force flags.
   */
  rm(
    path: string,
    options?: {
      force?: boolean;
      recursive?: boolean;
    },
  ): Promise<void>;

  /**
   * Rename or move a file system entry.
   */
  rename(oldPath: string, newPath: string): Promise<void>;

  /**
   * Retrieve metadata for files or directories.
   */
  stat(path: string): Promise<{
    size: number;
    mtime: Date;
    ctime: Date;
    atime: Date;
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
  }>;

  /**
   * Check whether a path exists in the sandbox workspace.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Find files matching one or more glob patterns.
   */
  glob(
    pattern: string | string[],
    options?: {
      cwd?: string;
      exclude?: ((path: string) => boolean) | string[];
      withFileTypes?: boolean;
    },
  ): Promise<string[] | Dirent[]>;

  /**
   * Watch a directory and receive callbacks for file system events.
   */
  watch(
    path: string,
    callback: (event: FileSystemEvent) => void,
    options?: WatchOptions,
  ): Promise<WatchHandle>;
}

/**
 * Supported file-system event names emitted by the watcher.
 */
export type FileSystemEventType = "create" | "modify" | "delete" | "move";

/**
 * Metadata describing a single file-system event.
 */
export interface FileSystemEvent {
  /** Type of the file system event */
  type: FileSystemEventType;
  /** Path of the affected file/directory */
  path: string;
  /** Whether the path is a directory */
  isDirectory: boolean;
  /** Timestamp when the event occurred */
  timestamp: number;
}

/**
 * Configuration accepted by the sandbox watch implementation.
 */
export interface WatchOptions {
  /** Watch subdirectories recursively */
  recursive?: boolean;
  /** Patterns to ignore (glob patterns) */
  ignore?: string[];
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Initial scan to get current state */
  initialScan?: boolean;
}

/**
 * Handle returned by `watch` that can stop observation.
 */
export interface WatchHandle {
  /** Unique identifier for this watch handle */
  id: string;
  /** The path being watched */
  path: string;
  /** Stop watching */
  stop(): Promise<void>;
  /** Check if still watching */
  isActive(): boolean;
}
