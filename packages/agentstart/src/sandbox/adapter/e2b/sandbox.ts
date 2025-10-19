import { Sandbox, type SandboxOpts } from "@e2b/code-interpreter";
import type { KV } from "@/kv";
import type { BashAPI } from "@/sandbox/types/bash";
import type { FileSystemAPI } from "@/sandbox/types/file-system";
import type { GitAPI } from "@/sandbox/types/git";
import type {
  E2BSandboxConfig,
  SandboxAPI,
  SandboxStatus,
} from "@/sandbox/types/sandbox";
import { Bash } from "./bash";
import { DEFAULT_CONFIG } from "./constants";
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
 * // In Agent initialization
 * const sandbox = await E2BSandbox.connectOrCreate({
 *   sandboxId: cachedSandboxId, // from previous thread
 *   kv: kvClient,
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
  kv: KV;

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
    this.kv = config.kv;
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
   * @param options.kv - Required KV client for heartbeat tracking
   * @param options.githubToken - Optional GitHub token for git operations
   * @returns Initialized E2BSandbox instance
   *
   * @example
   * ```typescript
   * const manager = await E2BSandbox.connectOrCreate({
   *   sandboxId: previousSandboxId,
   *   kv: kvClient,
   *   githubToken: 'ghp_...'
   * });
   * ```
   */
  static async connectOrCreate(
    options: E2BSandboxConfig & { githubToken?: string },
  ): Promise<E2BSandbox> {
    if (!options?.kv) {
      throw new Error("E2BSandbox requires a kv client");
    }

    const { sandboxId, githubToken, ...config } = options;
    const manager = new E2BSandbox({ ...config, sandboxId });

    if (sandboxId) {
      // Check if sandbox is still alive
      const isAlive = await manager.isSandboxAliveInStore(sandboxId);
      if (isAlive) {
        try {
          await manager.connect(sandboxId, githubToken);
          return manager;
        } catch (error) {
          console.warn(
            `Failed to connect to sandbox ${sandboxId}, creating new one...`,
            error,
          );
        }
      } else {
        console.log(
          `Sandbox ${sandboxId} expired (KV heartbeat missing), creating new one...`,
        );
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
   * @param options.kv - Required KV client for heartbeat tracking
   * @param options.githubToken - Optional GitHub token for git operations
   * @returns New E2BSandbox instance
   *
   * @example
   * ```typescript
   * const manager = await E2BSandbox.forceCreate({
   *   kv: kvClient,
   *   timeout: 300000 // 5 minutes
   * });
   * ```
   */
  static async forceCreate(
    options: E2BSandboxConfig & { githubToken?: string },
  ): Promise<E2BSandbox> {
    if (!options?.kv) {
      throw new Error("E2BSandbox requires a kv client");
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
        console.log(`Stopping E2B sandbox: ${this.sandboxId}`);
        await this.sandbox.kill();
        console.log(`E2B sandbox stopped: ${this.sandboxId}`);

        // Remove the heartbeat from KV
        if (this.sandboxId) {
          await this.clearSandboxHeartbeat(this.sandboxId);
        }
      } catch (error) {
        console.error(`Error stopping E2B sandbox: ${this.sandboxId}`, error);
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
      if (config.kv) {
        this.kv = config.kv;
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
   * Update activity timestamp
   */
  async keepAlive(): Promise<void> {
    await this.refreshHeartbeat();
  }

  /**
   * Set configuration
   */
  setConfig(config: E2BSandboxConfig): void {
    this.config = { ...this.config, ...config };
    this.kv = config.kv;
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
      console.log(`Creating E2B Sandbox...`);

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

      // Initialize tools with sandbox and manager reference for auto-keepAlive
      this.fs = new FileSystem(this.sandbox, this);
      this.bash = new Bash(this.sandbox, this);
      this.git = new Git(this.sandbox, this);

      // Set GitHub token if provided
      if (githubToken) {
        await this.git.setAuthToken(githubToken);
      }

      // Set initial heartbeat in KV
      await this.markSandboxAlive(this.sandboxId);

      console.log(`E2B Sandbox created: ${this.sandboxId}`);
    } catch (error) {
      console.error(`Failed to create E2B sandbox: ${this.sandboxId}`, error);
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
    const key = this.getHeartbeatKey(sandboxId);
    const exists = await this.kv.exists(key);
    return exists > 0;
  }

  private async markSandboxAlive(sandboxId: string): Promise<void> {
    const key = this.getHeartbeatKey(sandboxId);
    const ttl = this.getHeartbeatTtlMs();
    await this.kv.set(key, Date.now().toString(), { PX: ttl });
  }

  private async clearSandboxHeartbeat(sandboxId: string): Promise<void> {
    const key = this.getHeartbeatKey(sandboxId);
    await this.kv.del(key);
  }

  private async refreshHeartbeat(): Promise<void> {
    if (this.sandboxId && this.active) {
      this.lastActivityTime = Date.now();
      await this.markSandboxAlive(this.sandboxId);
    }
  }
}
