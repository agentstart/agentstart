/* agent-frontmatter:start
AGENT: Sandbox manager typing
PURPOSE: Describe lifecycle and helper APIs for managing sandbox instances
USAGE: Import to type sandbox manager implementations across the workspace
EXPORTS: SandboxStatus, SandboxConfig, SandboxManagerAPI
FEATURES:
  - Encapsulates sandbox lifecycle contracts
  - Exposes typed sub-APIs (fs, bash, git, dev)
  - Defines reusable configuration shapes
SEARCHABLE: sandbox manager api, lifecycle typing, sandbox contracts
agent-frontmatter:end */

import type { KV } from "@/kv";
import type { BashAPI } from "./bash";
import type { FileSystemAPI } from "./file-system";
import type { GitAPI } from "./git";

/**
 * Status flags describing the lifecycle state of a sandbox.
 */
export interface SandboxStatus {
  /** Whether the sandbox is currently active */
  active: boolean;
  /** Unique identifier for the sandbox */
  sandboxId: string | null;
  /** Time in milliseconds since sandbox was created */
  uptime: number;
  /** Time in milliseconds since last activity */
  lastActivity: number;
  /** Whether the sandbox can be reused */
  reusable: boolean;
}

/**
 * Base configuration shared across all sandbox implementations.
 */
export interface BaseSandboxConfig {
  /** Optional sandbox ID to reconnect to existing sandbox */
  sandboxId?: string;
  /** Timeout in milliseconds (max depends on plan) */
  timeout?: number;
  /** Maximum lifetime in milliseconds before forced recreation */
  maxLifetime?: number;
}

/**
 * E2B-specific sandbox configuration.
 * Requires KV for heartbeat tracking and cross-instance sandbox reuse.
 */
export interface E2BSandboxConfig extends BaseSandboxConfig {
  /** Required: KV client for heartbeat tracking */
  kv: KV;
  /** Optional: GitHub token for git operations */
  githubToken?: string;
  /** Ports to expose from the sandbox */
  ports?: number[];
  /** Runtime environment (e.g., "node22", "python3.13") */
  runtime?: string;
  /** CPU resources configuration */
  resources?: {
    vcpus?: number;
  };
  /** Auto-stop delay in milliseconds after inactivity */
  autoStopDelay?: number;
}

/**
 * Node.js-specific sandbox configuration.
 * KV is optional since local sandboxes typically don't need cross-process state.
 */
export interface NodeJSSandboxConfig extends BaseSandboxConfig {
  /** Optional: KV client for cross-process state sharing */
  kv?: KV;
  /** Local workspace path for file operations */
  workspacePath?: string;
}

/**
 * Legacy unified config for backward compatibility.
 * @deprecated Use E2BSandboxConfig or NodeJSSandboxConfig instead
 */
export interface SandboxConfig extends BaseSandboxConfig {
  kv: KV;
  workspacePath?: string;
  ports?: number[];
  runtime?: string;
  resources?: {
    vcpus?: number;
  };
  autoStopDelay?: number;
}

/**
 * Contract for sandbox lifecycle managers bound to a single project.
 */
export interface SandboxManagerAPI {
  /**
   * File system interface bound to this sandbox.
   */
  readonly fs: FileSystemAPI;

  /**
   * Bash helper scoped to the sandbox instance.
   */
  readonly bash: BashAPI;

  /**
   * Git command surface exposed by the sandbox.
   */
  readonly git: GitAPI;

  /**
   * Access the underlying provider-specific sandbox instance.
   */
  getSandbox(): Promise<unknown>;

  /**
   * Stop the sandbox and release allocated resources.
   */
  stop(): Promise<void>;

  /**
   * Restart the sandbox, optionally applying new configuration.
   */
  refresh(config?: BaseSandboxConfig): Promise<void>;

  /**
   * Retrieve the latest sandbox status snapshot.
   */
  getStatus(): SandboxStatus | Promise<SandboxStatus>;

  /**
   * Return the current sandbox identifier, if any.
   */
  getSandboxId(): string | null;

  /**
   * Indicate whether the sandbox remains active and usable.
   */
  isActive(): boolean | Promise<boolean>;

  /**
   * Refresh the activity heartbeat to avoid auto-stop.
   */
  keepAlive(): void | Promise<void>;

  /**
   * Persist configuration that will be applied to future sandboxes.
   */
  setConfig(config: BaseSandboxConfig): void;

  /**
   * Dispose manager resources and detach sandbox hooks.
   */
  dispose(): Promise<void>;
}

/**
 * Implementations typically surface static helpers (e.g., connectOrCreate, forceCreate);
 * callers should consult concrete classes for those factories.
 */
