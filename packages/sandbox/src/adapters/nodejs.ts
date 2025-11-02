/* agent-frontmatter:start
AGENT: Node.js Sandbox adapter factory
PURPOSE: Create SandboxAdapterFactory for local Node.js sandbox
USAGE: sandbox: nodeSandboxAdapter({ workspacePath, ... })
EXPORTS: nodeSandboxAdapter, NodeSandboxConfig
FEATURES:
  - Returns factory function compatible with AgentStartOptions
  - Wraps NodeSandbox.connectOrCreate with cleaner config interface
  - Supports local file system operations
SEARCHABLE: nodejs sandbox adapter factory, local sandbox
agent-frontmatter:end */

import type {
  AgentStartOptions,
  SandboxAdapterFactory,
  SandboxAPI,
} from "@agentstart/types";
import { NodeSandbox } from "../adapter/nodejs";

export interface NodeSandboxConfig {
  /**
   * Unique identifier for the sandbox instance (for reuse)
   */
  sandboxId?: string;
  /**
   * Local workspace path for file operations
   */
  workspacePath?: string;
  /**
   * Command timeout in milliseconds (default: 120000)
   */
  timeout?: number;
  /**
   * Maximum sandbox lifetime in milliseconds
   */
  maxLifetime?: number;
}

export function nodeSandboxAdapter(
  config?: NodeSandboxConfig,
): SandboxAdapterFactory {
  return async (options: AgentStartOptions): Promise<SandboxAPI> => {
    const secondaryMemory = options.secondaryMemory;

    return NodeSandbox.connectOrCreate(config?.sandboxId, {
      workspacePath: config?.workspacePath,
      timeout: config?.timeout,
      maxLifetime: config?.maxLifetime,
      secondaryMemory,
    });
  };
}
