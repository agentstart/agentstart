/* agent-frontmatter:start
AGENT: Agent options contract
PURPOSE: Provide the shared Agent Start configuration surface needed across packages without introducing circular dependencies
USAGE: import type { AgentStartOptions } from "@agentstart/types"
EXPORTS: AgentStartOptions, AgentAdvancedOptions, AgentGenerateTitleOptions, AgentGenerateSuggestionsOptions, Blob, Sandbox, SandboxBaseOptions
FEATURES:
  - Encapsulates the option fields required by adapters and runtime helpers
  - Uses adapter pattern for blob and sandbox configuration
  - Uses generics so runtimes can supply concrete Agent and model types
SEARCHABLE: agent options, sandbox configuration, blob configuration, advanced options
agent-frontmatter:end */
import type { AnyMiddleware } from "@orpc/server";
import type { Agent, LanguageModel } from "ai";
import type { CallOptions } from "./agent";
import type { BlobAdapter, BlobAdapterFactory } from "./blob";
import type {
  FieldAttribute,
  Memory,
  ModelOptions,
  SecondaryMemoryAdapter,
} from "./memory";
import type { SandboxAdapterFactory, SandboxAPI } from "./sandbox";

/**
 * Base options shared by all sandbox implementations.
 * Used internally by sandbox adapters.
 */
export interface SandboxBaseOptions {
  sandboxId?: string;
  timeout?: number;
  maxLifetime?: number;
  secondaryMemory?: SecondaryMemoryAdapter;
}

/**
 * Blob storage configuration type.
 * Accepts either a BlobAdapter instance or a BlobAdapterFactory function.
 *
 * @example
 * ```ts
 * import { vercelBlobAdapter } from "agentstart/blob";
 *
 * blob: vercelBlobAdapter({
 *   token: process.env.BLOB_TOKEN!,
 *   constraints: { maxFileSize: 10MB },
 * })
 * ```
 */
export type Blob = BlobAdapter | BlobAdapterFactory;

/**
 * Sandbox configuration type.
 * Accepts either a SandboxAPI instance or a SandboxAdapterFactory function.
 *
 * @example
 * ```ts
 * import { nodeSandboxAdapter, e2bSandboxAdapter } from "agentstart/sandbox";
 *
 * // Node.js sandbox
 * sandbox: nodeSandboxAdapter({ workspacePath: "/tmp/agentstart" })
 *
 * // E2B sandbox
 * sandbox: e2bSandboxAdapter({ apiKey: process.env.E2B_API_KEY! })
 * ```
 */
export type Sandbox = SandboxAPI | SandboxAdapterFactory;

export interface AgentGenerateTitleOptions {
  model: LanguageModel;
  instructions?: string;
}

export interface AgentGenerateSuggestionsOptions {
  model: LanguageModel;
  limit: number;
  instructions?: string;
}

export interface AgentAdvancedOptions {
  generateId?: false | ((options: { model: string; size?: number }) => string);
  generateTitle?: AgentGenerateTitleOptions;
  generateSuggestions?: AgentGenerateSuggestionsOptions;
}

export type AgentPluginSchema = Record<
  string,
  {
    fields: Record<string, FieldAttribute>;
  }
>;

export interface AgentPlugin {
  schema?: AgentPluginSchema;
  [key: string]: unknown;
}

/**
 * Advanced tuning knobs for internal agent behaviors.
 *
 * @example
 * ```ts
 * const advanced: AgentAdvancedOptions = {
 *   generateId: ({ model }) => `${model}-${crypto.randomUUID()}`,
 *   generateTitle: { model: claudeOpus },
 *   generateSuggestions: { model: gpt4Turbo, limit: 3 },
 * };
 * ```
 */
export interface AgentAdvancedOptions {
  /**
   * Override the ID generator per thread; return false to skip request-side IDs.
   * @type {false | ((options: { model: string; size?: number }) => string) | undefined}
   */
  generateId?: false | ((options: { model: string; size?: number }) => string);
  /**
   * Configure automatic thread title generation.
   * @type {AgentGenerateTitleOptions | undefined}
   */
  generateTitle?: AgentGenerateTitleOptions;
  /**
   * Configure suggestion generation for follow-up actions.
   * @type {AgentGenerateSuggestionsOptions | undefined}
   */
  generateSuggestions?: AgentGenerateSuggestionsOptions;
}

export interface AgentStartOptions {
  /**
   * Human-readable name used in UI surfaces and emitted events.
   * @type {string | undefined}
   */
  appName?: string;
  /**
   * Base URL that the agent should treat as its absolute origin.
   * @type {string | undefined}
   */
  baseURL?: string;
  /**
   * Base path prefix to mount routes under (e.g. `/api/agent`).
   * @type {`/${string}` | undefined}
   */
  basePath?: `/${string}`;
  /**
   * Primary memory adapter that stores messages and summaries.
   * @type {Memory | undefined}
   */
  memory?: Memory;
  /**
   * Optional secondary memory channel for long-lived artifacts.
   * @type {SecondaryMemoryAdapter | undefined}
   */
  secondaryMemory?: SecondaryMemoryAdapter;
  /**
   * Agent instance responsible for handling conversations and tool calls.
   * @type {Agent}
   */
  agent: Agent<CallOptions, any, any>;
  /**
   * Sandbox configuration controlling code execution environment.
   * @type {Sandbox | undefined}
   *
   * @example
   * ```ts
   * import { nodeSandboxAdapter, e2bSandboxAdapter } from "agentstart/sandbox";
   *
   * // Node.js sandbox (local)
   * sandbox: nodeSandboxAdapter({ workspacePath: "/tmp/agentstart" })
   *
   * // E2B sandbox (cloud)
   * sandbox: e2bSandboxAdapter({ apiKey: process.env.E2B_API_KEY! })
   * ```
   */
  sandbox?: Sandbox;
  /**
   * Extracts a stable user identifier from inbound request headers.
   * @type {((headers: Headers) => string | Promise<string>) | undefined}
   *
   * @example
   * ```ts
   * getUserId: async (headers) => headers.get("x-user-id") ?? "anonymous"
   * ```
   */
  getUserId?: (headers: Headers) => string | Promise<string>;
  /**
   * Additional ORPC middleware to run ahead of the agent handler.
   * @type {AnyMiddleware[] | undefined}
   *
   * @example
   * ```ts
   * middleware: [loggerMiddleware(), authMiddleware()]
   * ```
   */
  middleware?: AnyMiddleware[];
  /**
   * Advanced tuning knobs for internal agent behaviors.
   * @type {AgentAdvancedOptions | undefined}
   */
  advanced?: AgentAdvancedOptions;
  /**
   * Blob storage configuration controlling storage provider selection and constraints.
   * @type {Blob | undefined}
   *
   * @example
   * ```ts
   * import { vercelBlobAdapter, s3BlobAdapter } from "agentstart/blob";
   *
   * // Vercel Blob
   * blob: vercelBlobAdapter({
   *   token: process.env.BLOB_TOKEN!,
   *   constraints: { maxFileSize: 10MB },
   * })
   *
   * // AWS S3
   * blob: s3BlobAdapter({
   *   credentials: { accessKeyId, secretAccessKey },
   *   bucket: "my-bucket",
   * })
   * ```
   */
  blob?: Blob;
  /**
   * Model defaults applied to thread-level reasoning tasks.
   * @type {ModelOptions | undefined}
   */
  thread?: ModelOptions;
  /**
   * Model defaults applied to message-level reasoning tasks.
   * @type {ModelOptions | undefined}
   */
  message?: ModelOptions;
  /**
   * Model defaults applied when generating task lists or TODO items.
   * @type {ModelOptions | undefined}
   */
  todo?: ModelOptions;
}

export type AgentStartOptionsWithoutAgent = Omit<AgentStartOptions, "agent"> & {
  agent?: AgentStartOptions["agent"];
};
