/* agent-frontmatter:start
AGENT: Agent configuration options
PURPOSE: Define the primary configuration contract consumed by Agent Start runtimes
USAGE: Import types from "agentstart" to author agentstart.config.ts files
EXPORTS: AgentStartOptions, SandboxOptions, SandboxProvider
FEATURES:
  - Encapsulates high-level agent configuration knobs
  - Adds sandbox credential support for provider adapters
  - Keeps optional model overrides grouped by use case
SEARCHABLE: agent configuration, sandbox options, e2b api key, agentstart options
agent-frontmatter:end */

import type { AnyMiddleware } from "@orpc/server";
import type { LanguageModel } from "ai";
import type { Memory, ModelOptions, SecondaryMemory } from "./adapter";
import type { Agent } from "./agent";

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

export interface AgentStartOptions {
  appName?: string;
  baseURL?: string;
  basePath?: `/${string}`;
  memory?: Memory;
  secondaryMemory?: SecondaryMemory;
  agent: Agent;
  sandbox?: SandboxOptions;
  getUserId?: (headers: Headers) => string | Promise<string>;
  middleware?: AnyMiddleware[];
  advanced?: {
    generateId?:
      | false
      | ((options: { model: string; size?: number }) => string);
    generateTitle?: {
      model: LanguageModel;
      instructions: string;
    };
    generateSuggestions?: {
      model: LanguageModel;
      limit: number;
      instructions: string;
    };
  };
  thread?: ModelOptions;
  message?: ModelOptions;
  todo?: ModelOptions;
}
