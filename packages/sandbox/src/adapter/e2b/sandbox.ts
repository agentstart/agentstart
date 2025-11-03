/* agent-frontmatter:start
AGENT: Agent sandbox adapter
PURPOSE: Manages the lifecycle of E2B sandboxes and exposes a unified SandboxAPI implementation.
USAGE: Instantiate through connectOrCreate to reuse or create sandbox environments.
EXPORTS: E2BSandbox
FEATURES:
  - Reconnects to existing sandboxes via secondaryMemory heartbeat tracking
  - Initializes bash, git, and file-system adapters for downstream tools
SEARCHABLE: packages, agentstart, src, sandbox, adapter, e2b, lifecycle, manager
agent-frontmatter:end */

import type {
  BashAPI,
  E2BSandboxConfig,
  FileSystemAPI,
  GitAPI,
  SandboxAPI,
  SandboxStatus,
  SecondaryMemoryAdapter,
} from "@agentstart/types";
import { Sandbox, type SandboxOpts } from "@e2b/code-interpreter";
import { Bash } from "./bash";
import { DEFAULT_CONFIG, DEFAULT_WORKING_DIRECTORY } from "./constants";
import { FileSystem } from "./file-system";
import { Git } from "./git";

/**
 * E2B sandbox implementation of SandboxAPI
 *
 * IMPORTANT: This class manages a single project's sandbox lifecycle.
 * Each Agent/Project should maintain ONE E2BSandbox instance and inject
 * it into all tools that need sandbox access.
 *
 * Usage pattern:
 * ```typescript
 * import { redisAdapter } from '@agentstart/secondary-memory/redis';
 * import Redis from 'ioredis';
 *
 * // Setup secondary memory (for sandbox heartbeat tracking)
 * const redis = new Redis();
 * const secondaryMemory = redisAdapter({ client: redis });
 *
 * // In Agent initialization
 * const sandbox = await E2BSandbox.connectOrCreate({
 *   sandboxId: cachedSandboxId, // from previous thread
 *   secondaryMemory: secondaryMemory,
 *   githubToken: token
 * });
 *
 * // Inject into tools
 * const tools = [
 *   new MyTool({ sandbox }),
 *   new AnotherTool({ sandbox })
 * ];
 *
 * // Clean up when Agent is done
 * await sandbox.dispose();
 * ```
 */
export class E2BSandbox implements SandboxAPI {
  fs!: FileSystemAPI;
  bash!: BashAPI;
  git!: GitAPI;
  secondaryMemory: SecondaryMemoryAdapter;

  private sandbox: Sandbox | null = null;
  private sandboxId: string | null = null;
  private active: boolean = false;
  private createdAt: number = 0;
  private lastActivityTime: number = Date.now();
  private config: E2BSandboxConfig;

  /**
   * Private constructor - use static factory methods instead
   */
  private constructor(config: E2BSandboxConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (!config.secondaryMemory) {
      throw new Error("E2BSandbox requires a secondaryMemory");
    }
    this.secondaryMemory = config.secondaryMemory;
  }

  /**
   * Connect to an existing sandbox or create a new one
   *
   * This is the recommended factory method for most use cases.
   * If sandboxId is provided and the sandbox is still alive, it will reconnect.
   * Otherwise, it will create a fresh sandbox.
   *
   * @param options - Configuration options
   * @param options.sandboxId - Optional existing sandbox ID to reconnect
   * @param options.secondaryMemory - Required secondary memory for heartbeat tracking (use redisAdapter from @agentstart/secondary-memory)
   * @param options.githubToken - Optional GitHub token for git operations
   * @returns Initialized E2BSandbox instance
   *
   * @example
   * ```typescript
   * import { redisAdapter } from '@agentstart/secondary-memory/redis';
   * import Redis from 'ioredis';
   *
   * const redis = new Redis();
   * const secondaryMemory = redisAdapter({ client: redis });
   *
   * const manager = await E2BSandbox.connectOrCreate({
   *   sandboxId: previousSandboxId,
   *   secondaryMemory: secondaryMemory,
   *   githubToken: 'ghp_...'
   * });
   * ```
   */
  static async connectOrCreate(
    options: E2BSandboxConfig & { githubToken?: string },
  ): Promise<E2BSandbox> {
    if (!options?.secondaryMemory) {
      throw new Error("E2BSandbox requires a secondaryMemory");
    }

    const { sandboxId, githubToken, ...config } = options;
    const manager = new E2BSandbox({ ...config, sandboxId });

    if (sandboxId) {
      // Check if sandbox is still alive
      const isAlive = await manager.isSandboxAliveInStore(sandboxId);

      if (isAlive) {
        try {
          await manager.connect(sandboxId, githubToken);
          console.log(`[E2B] Connected to existing sandbox ${sandboxId}`);
          return manager;
        } catch (error) {
          console.warn(
            `[E2B] Failed to connect to sandbox ${sandboxId}:`,
            error,
          );
        }
      }
    }

    // Create new sandbox if no ID provided or connection failed
    await manager.createSandbox(githubToken);
    return manager;
  }

  /**
   * Force create a brand new sandbox
   *
   * Use this when you explicitly want a fresh sandbox regardless of
   * whether a previous one exists. Most use cases should use connectOrCreate() instead.
   *
   * @param options - Configuration options
   * @param options.secondaryMemory - Required secondary memory for heartbeat tracking (use redisAdapter from @agentstart/secondary-memory)
   * @param options.githubToken - Optional GitHub token for git operations
   * @returns New E2BSandbox instance
   *
   * @example
   * ```typescript
   * import { redisAdapter } from '@agentstart/secondary-memory/redis';
   * import Redis from 'ioredis';
   *
   * const redis = new Redis();
   * const secondaryMemory = redisAdapter({ client: redis });
   *
   * const manager = await E2BSandbox.forceCreate({
   *   secondaryMemory: secondaryMemory,
   *   timeout: 300000 // 5 minutes
   * });
   * ```
   */
  static async forceCreate(
    options: E2BSandboxConfig & { githubToken?: string },
  ): Promise<E2BSandbox> {
    if (!options?.secondaryMemory) {
      throw new Error("E2BSandbox requires a secondaryMemory");
    }

    const { githubToken, ...config } = options;
    const manager = new E2BSandbox(config);
    await manager.createSandbox(githubToken);
    return manager;
  }

  /**
   * Connect to an existing sandbox
   * @private
   */
  private async connect(
    sandboxId: string,
    githubToken?: string,
  ): Promise<void> {
    this.sandbox = await Sandbox.connect(sandboxId);
    this.sandboxId = sandboxId;
    this.active = true;

    // Initialize tools with sandbox and manager reference for auto-keepAlive
    this.fs = new FileSystem(this.sandbox, this);
    this.bash = new Bash(this.sandbox, this);
    this.git = new Git(this.sandbox, this);

    // Ensure default working directory exists
    try {
      await this.sandbox.commands.run(`mkdir -p ${DEFAULT_WORKING_DIRECTORY}`, {
        cwd: "/home/user",
      });
    } catch (error) {
      console.warn(
        `[E2B] Failed to create working directory ${DEFAULT_WORKING_DIRECTORY}:`,
        error,
      );
    }

    // Set GitHub token if provided
    if (githubToken) {
      await this.git.setAuthToken(githubToken);
    }

    // Refresh the heartbeat after successful connection
    await this.refreshHeartbeat();
  }

  /**
   * Get the underlying sandbox instance
   * Note: For most operations, use the provided APIs (fs, bash, git, dev) directly
   */
  async getSandbox(): Promise<Sandbox> {
    if (!this.sandbox) {
      throw new Error(
        "Sandbox not initialized. Use E2BSandbox.get() or E2BSandbox.create() first.",
      );
    }
    return this.sandbox;
  }

  /**
   * Stop the sandbox to free resources
   */
  async stop(): Promise<void> {
    if (this.sandbox && this.active) {
      try {
        await this.sandbox.kill();
        // Remove the heartbeat from secondaryMemory
        if (this.sandboxId) {
          await this.clearSandboxHeartbeat(this.sandboxId);
        }
      } catch (error) {
        console.error(`[E2B] Error stopping sandbox ${this.sandboxId}:`, error);
      }
    }

    this.sandbox = null;
    this.sandboxId = null;
    this.active = false;
    this.createdAt = 0;
  }

  /**
   * Force refresh the sandbox
   */
  async refresh(config?: E2BSandboxConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
      if (config.secondaryMemory) {
        this.secondaryMemory = config.secondaryMemory;
      }
    }
    await this.stop();
    await this.createSandbox();
  }

  /**
   * Get current sandbox status
   */
  async getStatus(): Promise<SandboxStatus> {
    const isAlive = this.sandboxId
      ? await this.isSandboxAliveInStore(this.sandboxId)
      : false;

    return {
      active: this.active,
      sandboxId: this.sandboxId,
      uptime: this.createdAt ? Date.now() - this.createdAt : 0,
      lastActivity: Date.now() - this.lastActivityTime,
      reusable: this.active && isAlive,
    };
  }

  /**
   * Get the current sandbox ID
   */
  getSandboxId(): string | null {
    return this.sandboxId;
  }

  /**
   * Check if the sandbox is active
   */
  async isActive(): Promise<boolean> {
    if (!this.active || !this.sandboxId) return false;
    return await this.isSandboxAliveInStore(this.sandboxId);
  }

  /**
   * Update activity timestamp and extend sandbox timeout
   */
  async keepAlive(): Promise<void> {
    if (!this.sandbox || !this.active) return;

    try {
      // Extend E2B sandbox timeout
      const extendedTimeout = this.config.timeout || DEFAULT_CONFIG.timeout;
      await this.sandbox.setTimeout(extendedTimeout);

      // Refresh heartbeat in secondary memory
      await this.refreshHeartbeat();
    } catch (error) {
      console.warn(
        `[E2B] Failed to extend timeout for sandbox ${this.sandboxId}:`,
        error,
      );
      // Mark sandbox as inactive if timeout extension fails
      this.active = false;
      throw error;
    }
  }

  /**
   * Set configuration
   */
  setConfig(config: E2BSandboxConfig): void {
    this.config = { ...this.config, ...config };
    if (config.secondaryMemory) {
      this.secondaryMemory = config.secondaryMemory;
    }
  }

  /**
   * Dispose of the sandbox manager
   */
  async dispose(): Promise<void> {
    await this.stop();
  }

  private async createSandbox(githubToken?: string): Promise<void> {
    // Stop existing sandbox if any
    await this.stop();

    try {
      // Convert config to E2B format
      const timeoutMs = Math.floor(
        this.config.timeout || DEFAULT_CONFIG.timeout,
      );

      // E2B sandbox creation options
      const createOptions: SandboxOpts = {
        timeoutMs,
        metadata: {
          env: process.env.NODE_ENV ?? "development",
        },
      };

      this.sandbox = await Sandbox.create(createOptions);
      this.sandboxId = this.sandbox.sandboxId;
      this.active = true;
      this.createdAt = Date.now();
      this.lastActivityTime = Date.now();

      console.log(`[E2B] Sandbox created: ${this.sandboxId}`);

      // Initialize tools with sandbox and manager reference for auto-keepAlive
      this.fs = new FileSystem(this.sandbox, this);
      this.bash = new Bash(this.sandbox, this);
      this.git = new Git(this.sandbox, this);

      // Create default working directory if it doesn't exist
      try {
        await this.sandbox.commands.run(
          `mkdir -p ${DEFAULT_WORKING_DIRECTORY}`,
          {
            cwd: "/home/user",
          },
        );
      } catch (error) {
        console.warn(
          `[E2B] Failed to create working directory ${DEFAULT_WORKING_DIRECTORY}:`,
          error,
        );
      }

      // Set GitHub token if provided
      if (githubToken) {
        await this.git.setAuthToken(githubToken);
      }

      // Set initial heartbeat in secondaryMemory
      await this.markSandboxAlive(this.sandboxId);
    } catch (error) {
      console.error(`[E2B] Failed to create sandbox:`, error);
      this.sandbox = null;
      this.active = false;
      throw error;
    }
  }

  // Private helper methods
  private getHeartbeatKey(sandboxId: string): string {
    return `sandbox:heartbeat:${sandboxId}`;
  }

  private getHeartbeatTtlMs(): number {
    const ttl =
      this.config.autoStopDelay ??
      this.config.timeout ??
      DEFAULT_CONFIG.timeout ??
      60000;
    return Math.max(1, ttl);
  }

  private async isSandboxAliveInStore(sandboxId: string): Promise<boolean> {
    try {
      const key = this.getHeartbeatKey(sandboxId);
      const value = await this.secondaryMemory.get(key);
      return value !== null;
    } catch (error) {
      console.error(
        `[E2B] Error checking heartbeat for sandbox ${sandboxId}:`,
        error,
      );
      return false;
    }
  }

  private async markSandboxAlive(sandboxId: string): Promise<void> {
    try {
      const key = this.getHeartbeatKey(sandboxId);
      const ttl = this.getHeartbeatTtlMs();
      const timestamp = Date.now();
      await this.secondaryMemory.set(key, timestamp.toString(), ttl);
    } catch (error) {
      console.error(
        `[E2B] Error marking sandbox ${sandboxId} as alive:`,
        error,
      );
      throw error;
    }
  }

  private async clearSandboxHeartbeat(sandboxId: string): Promise<void> {
    try {
      const key = this.getHeartbeatKey(sandboxId);
      await this.secondaryMemory.delete(key);
    } catch (error) {
      console.error(
        `[E2B] Error clearing heartbeat for sandbox ${sandboxId}:`,
        error,
      );
    }
  }

  private async refreshHeartbeat(): Promise<void> {
    if (this.sandboxId && this.active) {
      this.lastActivityTime = Date.now();
      await this.markSandboxAlive(this.sandboxId);
    }
  }
}
