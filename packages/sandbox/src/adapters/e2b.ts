/* agent-frontmatter:start
AGENT: E2B Sandbox adapter factory
PURPOSE: Create SandboxAdapterFactory for E2B cloud sandbox
USAGE: sandbox: e2bSandboxAdapter({ apiKey, ... })
EXPORTS: e2bSandboxAdapter, E2BSandboxConfig
FEATURES:
  - Returns factory function compatible with AgentStartOptions
  - Wraps E2BSandbox.connectOrCreate with cleaner config interface
  - Supports cloud-based isolated execution environment
SEARCHABLE: e2b sandbox adapter factory, cloud sandbox
agent-frontmatter:end */

import type {
  AgentStartOptions,
  SandboxAdapterFactory,
  SandboxAPI,
} from "@agentstart/types";
import { AgentStartError } from "@agentstart/utils";
import { E2BSandbox } from "../adapter/e2b";

export interface E2BSandboxConfig {
  /**
   * E2B API key for authentication
   */
  apiKey: string;
  /**
   * Unique identifier for the sandbox instance (for reuse)
   */
  sandboxId?: string;
  /**
   * GitHub token for git operations (optional)
   */
  githubToken?: string;
  /**
   * Command timeout in milliseconds (default: 120000)
   */
  timeout?: number;
  /**
   * Maximum sandbox lifetime in milliseconds
   */
  maxLifetime?: number;
  /**
   * Ports to expose from the sandbox
   */
  ports?: number[];
  /**
   * Runtime environment (e.g., "node20", "python3.13")
   */
  runtime?: string;
  /**
   * CPU resources configuration
   */
  resources?: {
    vcpus?: number;
  };
  /**
   * Auto-stop delay in seconds after inactivity
   */
  autoStopDelay?: number;
}

export function e2bSandboxAdapter(
  config: E2BSandboxConfig,
): SandboxAdapterFactory {
  return async (options: AgentStartOptions): Promise<SandboxAPI> => {
    if (!config.apiKey) {
      throw new AgentStartError(
        "SANDBOX_API_KEY_MISSING",
        "E2B sandbox requires an apiKey",
      );
    }

    if (process.env.E2B_API_KEY !== config.apiKey) {
      process.env.E2B_API_KEY = config.apiKey;
    }

    const secondaryMemory = options.secondaryMemory;
    if (!secondaryMemory) {
      throw new AgentStartError(
        "SECONDARY_MEMORY_MISSING",
        "E2B sandbox requires secondaryMemory to be provided via AgentStartOptions",
      );
    }

    return E2BSandbox.connectOrCreate({
      secondaryMemory,
      sandboxId: config.sandboxId,
      githubToken: config.githubToken,
      timeout: config.timeout,
      maxLifetime: config.maxLifetime,
      ports: config.ports,
      runtime: config.runtime,
      resources: config.resources,
      autoStopDelay: config.autoStopDelay,
    });
  };
}
