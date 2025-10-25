/* agent-frontmatter:start
AGENT: Agent configuration options
PURPOSE: Define the primary configuration contract consumed by Agent Start runtimes
USAGE: Import types from "agentstart" to author agentstart.config.ts files
EXPORTS: AgentStartOptions, AgentAdvancedOptions, AgentGenerateTitleOptions, AgentGenerateSuggestionsOptions, SandboxOptions, SandboxProvider
FEATURES:
  - Encapsulates high-level agent configuration knobs
  - Adds sandbox credential support for provider adapters
  - Keeps optional model overrides grouped by use case
SEARCHABLE: agent configuration, sandbox options, e2b api key, agentstart options
agent-frontmatter:end */

import type { AnyMiddleware } from "@orpc/server";
import type { LanguageModel } from "ai";
import type { BaseAgent } from "@/agent/agent";
import type { Memory, ModelOptions, SecondaryMemory } from "./adapter";

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

/**
 * Controls automatic title generation for agent threads.
 *
 * @example
 * ```ts
 * generateTitle: {
 *   model: claudeOpus,
 *   instructions: "Keep titles concise and human readable."
 * }
 * ```
 */
export interface AgentGenerateTitleOptions {
  /**
   * Language model used to synthesize the thread title.
   * @type {LanguageModel}
   */
  model: LanguageModel;
  /**
   * Optional instructions appended to the title generation prompt.
   * @type {string | undefined}
   */
  instructions?: string;
}

/**
 * Configures automated suggestion generation for user follow-up actions.
 *
 * @example
 * ```ts
 * generateSuggestions: {
 *   model: gpt4Turbo,
 *   limit: 3,
 *   instructions: "Focus on next steps for debugging."
 * }
 * ```
 */
export interface AgentGenerateSuggestionsOptions {
  /**
   * Language model used to produce follow-up suggestions.
   * @type {LanguageModel}
   */
  model: LanguageModel;
  /**
   * Maximum number of suggestions to emit.
   * @type {number}
   */
  limit: number;
  /**
   * Optional instructions appended to the suggestion prompt.
   * @type {string | undefined}
   */
  instructions?: string;
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
  // biome-ignore lint/suspicious/noExplicitAny: is fine
  agent: BaseAgent<any, any>;
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
