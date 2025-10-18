/* agent-frontmatter:start
AGENT: Node.js sandbox manager adapter
PURPOSE: Provide an in-process sandbox manager that mirrors the shared sandbox API for local Node.js usage
USAGE: Instantiate to gain access to bash, git, fs, and dev helpers without provisioning remote sandboxes
EXPORTS: SandboxManager
FEATURES:
  - Reuses adapters scoped to a configurable workspace directory
  - Tracks lifecycle metadata and exposes status helpers
  - Supports configuration updates with live tool reinitialization
SEARCHABLE: nodejs sandbox manager, local sandbox implementation, adapter lifecycle
agent-frontmatter:end */

import type { BashAPI } from "@/sandbox/types/bash";
import type { DevAPI } from "@/sandbox/types/dev";
import type { FileSystemAPI } from "@/sandbox/types/file-system";
import type { GitAPI } from "@/sandbox/types/git";
import type {
  NodeJSSandboxConfig,
  SandboxManagerAPI,
  SandboxStatus,
} from "@/sandbox/types/sandbox-manager";

import { Bash } from "./bash";
import { Dev } from "./dev";
import { FileSystem } from "./file-system";
import { Git } from "./git";

// Store instances outside of class
const instances = new Map<string, SandboxManager>();

/**
 * Node.js implementation of SandboxManagerAPI
 *
 * IMPORTANT: This class manages a single project's sandbox lifecycle.
 * Each Agent/Project should maintain ONE SandboxManager instance and inject
 * it into all tools that need sandbox access.
 *
 * Usage pattern:
 * ```typescript
 * // In Agent initialization
 * const sandboxManager = await SandboxManager.connectOrCreate(
 *   projectId,
 *   { workspacePath: '/path/to/project' }
 * );
 *
 * // Inject into tools
 * const tools = [
 *   new MyTool({ sandbox: sandboxManager }),
 *   new AnotherTool({ sandbox: sandboxManager })
 * ];
 *
 * // Clean up when Agent is done
 * await sandboxManager.dispose();
 * ```
 *
 * Note: In Node.js environment, we don't need actual sandboxing.
 * This implementation provides compatibility with the E2B API.
 */
export class SandboxManager implements SandboxManagerAPI {
  private static readonly DEFAULT_CONFIG: Partial<NodeJSSandboxConfig> = {};

  readonly fs: FileSystemAPI;
  readonly bash: BashAPI;
  readonly git: GitAPI;
  readonly dev: DevAPI;

  private sandboxId: string;
  private createdAt: number = Date.now();
  private lastActivityTime: number = Date.now();
  private config: NodeJSSandboxConfig;
  private workingDirectory: string;

  constructor(sandboxId: string, config?: NodeJSSandboxConfig) {
    this.sandboxId = sandboxId;
    this.config = { ...SandboxManager.DEFAULT_CONFIG, ...config };
    this.workingDirectory = this.config.workspacePath ?? process.cwd();

    // Initialize tools (Node.js doesn't need a real sandbox)
    this.fs = new FileSystem(this.workingDirectory);
    this.bash = new Bash(this.workingDirectory);
    this.git = new Git(this.workingDirectory);
    this.dev = new Dev(this.workingDirectory);

    instances.set(this.sandboxId, this);
  }

  /**
   * Connect to an existing sandbox or create a new one
   *
   * This is the recommended factory method for most use cases.
   * If sandboxId already exists, it will reuse the existing manager.
   * Otherwise, it will create a new one.
   *
   * @param sandboxId - Optional sandbox ID (defaults to generated ID)
   * @param config - Configuration options
   * @returns Initialized SandboxManager instance
   *
   * @example
   * ```typescript
   * const manager = await SandboxManager.connectOrCreate('project-1', {
   *   workspacePath: '/path/to/project'
   * });
   * ```
   */
  static async connectOrCreate(
    sandboxId?: string,
    config?: NodeJSSandboxConfig,
  ): Promise<SandboxManager> {
    const id = sandboxId ?? `nodejs-${Date.now()}`;
    const existing = instances.get(id);
    if (existing) {
      if (config) {
        existing.setConfig(config);
      }
      return existing;
    }

    return new SandboxManager(id, config);
  }

  /**
   * Force create a brand new sandbox with a fresh ID
   *
   * Use this when you explicitly want a fresh sandbox regardless of
   * whether a previous one exists. Most use cases should use connectOrCreate() instead.
   *
   * @param config - Configuration options
   * @returns New SandboxManager instance
   *
   * @example
   * ```typescript
   * const manager = await SandboxManager.forceCreate({
   *   workspacePath: '/path/to/project'
   * });
   * ```
   */
  static async forceCreate(
    config?: NodeJSSandboxConfig,
  ): Promise<SandboxManager> {
    const id = config?.sandboxId ?? `nodejs-${Date.now()}`;
    return new SandboxManager(id, config);
  }

  /**
   * Get sandbox information (Node.js returns a lightweight descriptor)
   */
  async getSandbox(options?: {
    forceNew?: boolean;
    config?: NodeJSSandboxConfig;
  }): Promise<{
    id: string;
    sandboxId: string;
    workingDirectory: string;
    createdAt: number;
    lastActivity: number;
    type: "nodejs";
    config: NodeJSSandboxConfig;
    getInfo: () => Promise<{
      id: string;
      sandboxId: string;
      state: "running";
      workingDirectory: string;
      createdAt: number;
      lastActivity: number;
      type: "nodejs";
      config: NodeJSSandboxConfig;
    }>;
  }> {
    if (options?.config) {
      this.config = { ...this.config, ...options.config };
    }

    if (options?.forceNew) {
      instances.delete(this.sandboxId);
      this.sandboxId = `nodejs-${Date.now()}`;
      this.createdAt = Date.now();
      instances.set(this.sandboxId, this);
    }

    this.lastActivityTime = Date.now();

    return {
      id: this.sandboxId,
      sandboxId: this.sandboxId,
      workingDirectory: this.workingDirectory,
      createdAt: this.createdAt,
      lastActivity: this.lastActivityTime,
      type: "nodejs" as const,
      config: { ...this.config },
      getInfo: async () => ({
        id: this.sandboxId,
        sandboxId: this.sandboxId,
        state: "running" as const,
        workingDirectory: this.workingDirectory,
        createdAt: this.createdAt,
        lastActivity: this.lastActivityTime,
        type: "nodejs" as const,
        config: { ...this.config },
      }),
    };
  }

  /**
   * Stop (no-op in Node.js)
   */
  async stop(): Promise<void> {
    console.log(
      `SandboxManager.stop() called for project ${this.sandboxId} (no-op in Node.js)`,
    );
    instances.delete(this.sandboxId);
  }

  /**
   * Refresh (regenerate ID in Node.js)
   */
  async refresh(config?: NodeJSSandboxConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    instances.delete(this.sandboxId);
    this.sandboxId = `nodejs-${Date.now()}`;
    this.createdAt = Date.now();
    instances.set(this.sandboxId, this);
  }

  /**
   * Get status
   */
  getStatus(): SandboxStatus {
    return {
      active: true,
      sandboxId: this.sandboxId,
      uptime: Date.now() - this.createdAt,
      lastActivity: Date.now() - this.lastActivityTime,
      reusable: true,
    };
  }

  /**
   * Get sandbox ID
   */
  getSandboxId(): string | null {
    return this.sandboxId;
  }

  /**
   * Check if active (always true in Node.js)
   */
  isActive(): boolean {
    return true;
  }

  /**
   * Update activity
   */
  keepAlive(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Set configuration
   */
  setConfig(config: NodeJSSandboxConfig): void {
    const nextConfig = { ...this.config, ...config };
    const nextWorkingDirectory =
      nextConfig.workspacePath ?? this.workingDirectory;
    const workingDirectoryChanged =
      nextWorkingDirectory !== this.workingDirectory;

    this.config = nextConfig;
    this.workingDirectory = nextWorkingDirectory;

    if (workingDirectoryChanged) {
      (this as { fs: FileSystemAPI }).fs = new FileSystem(
        this.workingDirectory,
      );
      (this as { bash: BashAPI }).bash = new Bash(this.workingDirectory);
      (this as { git: GitAPI }).git = new Git(this.workingDirectory);
      (this as { dev: DevAPI }).dev = new Dev(this.workingDirectory);
    }
  }

  /**
   * Dispose (no-op in Node.js)
   */
  async dispose(): Promise<void> {
    console.log(
      `SandboxManager.dispose() called for project ${this.sandboxId} (no-op in Node.js)`,
    );
    instances.delete(this.sandboxId);
  }
}
