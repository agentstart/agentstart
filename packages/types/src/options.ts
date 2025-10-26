/* agent-frontmatter:start
AGENT: Agent options contract
PURPOSE: Provide the shared Agent Start configuration surface needed across packages without introducing circular dependencies
USAGE: import type { AgentStartOptions } from "@agentstart/types"
EXPORTS: AgentStartOptions, AgentAdvancedOptions, AgentGenerateTitleOptions, AgentGenerateSuggestionsOptions, SandboxOptions, SandboxProvider, SandboxBaseOptions
FEATURES:
  - Encapsulates the option fields required by adapters and runtime helpers
  - Uses generics so runtimes can supply concrete Agent and model types
SEARCHABLE: agent options, sandbox configuration, advanced options
agent-frontmatter:end */
import type { AnyMiddleware } from "@orpc/server";
import type { Agent, LanguageModel } from "ai";
import type { CallOptions } from "./agent";
import type { BlobOptions } from "./blob";
import type {
  FieldAttribute,
  Memory,
  ModelOptions,
  SecondaryMemory,
} from "./memory";

export interface SandboxBaseOptions {
  sandboxId?: string;
  timeout?: number;
  maxLifetime?: number;
  secondaryMemory?: SecondaryMemory;
}

export interface NodeSandboxOptions extends SandboxBaseOptions {
  provider: "nodejs";
  workspacePath?: string;
}

export interface E2BSandboxOptions extends SandboxBaseOptions {
  provider: "e2b";
  apiKey: string;
  githubToken?: string;
  ports?: number[];
  runtime?: string;
  resources?: {
    vcpus?: number;
  };
  autoStopDelay?: number;
}

export type SandboxOptions = NodeSandboxOptions | E2BSandboxOptions;

export type SandboxProvider = SandboxOptions["provider"];

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
   * @type {SecondaryMemory | undefined}
   */
  secondaryMemory?: SecondaryMemory;
  /**
   * Agent instance responsible for handling conversations and tool calls.
   * @type {Agent}
   */
  agent: Agent<CallOptions, any, any>;
  /**
   * Sandbox configuration controlling code execution providers and limits.
   * @type {SandboxOptions | undefined}
   *
   * @example
   * ```ts
   * sandbox: {
   *   provider: "nodejs",
   *   workspacePath: "/tmp/agentstart",
   * };
   * ```
   */
  sandbox?: SandboxOptions;
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
   * @type {BlobOptions | undefined}
   */
  blob?: BlobOptions;
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
