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

import type { KV } from "../kv";
import type { Memory, ModelOptions, SecondaryMemory } from "./adapter";
import type { Agent } from "./agent";

export type NodeSandboxOptions = {
  provider: "nodejs";
  sandboxId?: string;
  workspacePath?: string;
  timeout?: number;
  maxLifetime?: number;
  kv?: KV;
};

export type E2BSandboxOptions = {
  provider: "e2b";
  apiKey: string;
  sandboxId?: string;
  githubToken?: string;
  timeout?: number;
  maxLifetime?: number;
  ports?: number[];
  runtime?: string;
  resources?: {
    vcpus?: number;
  };
  autoStopDelay?: number;
  kv?: KV;
};

export type SandboxOptions = NodeSandboxOptions | E2BSandboxOptions;

export type SandboxProvider = SandboxOptions["provider"];

export type AgentStartOptions = {
  appName?: string;
  baseURL?: string;
  basePath?: `/${string}`;
  memory?: Memory;
  secondaryMemory?: SecondaryMemory;
  agent: Agent;
  sandbox?: SandboxOptions;
  getUserId?: (headers: Headers) => string | Promise<string>;
  advanced?: {
    generateId?:
      | false
      | ((options: { model: string; size?: number }) => string);
  };
  thread?: ModelOptions;
  message?: ModelOptions;
  todo?: ModelOptions;
};
