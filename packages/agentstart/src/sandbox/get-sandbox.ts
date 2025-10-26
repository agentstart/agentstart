/* agent-frontmatter:start
AGENT: Sandbox resolver
PURPOSE: Select and initialize the sandbox instance based on runtime configuration
USAGE: const sandbox = await getSandbox(agentOptions)
EXPORTS: getSandbox
FEATURES:
  - Supports Node.js and E2B sandbox providers
  - Caches initialized sandboxes for reuse
  - Uses secondaryMemory from options for sandbox state management
SEARCHABLE: sandbox resolver, getSandbox, e2b sandbox setup
agent-frontmatter:end */

import type {
  AgentStartOptions,
  E2BSandboxOptions,
  NodeSandboxOptions,
} from "@agentstart/types";
import { AgentStartError } from "@agentstart/utils";
import type { SandboxAPI } from "@/sandbox";
import { E2BSandbox } from "@/sandbox/adapter/e2b";
import { NodeSandbox } from "@/sandbox/adapter/nodejs";

const sandboxCache = new Map<string, Promise<SandboxAPI>>();

const getCacheKey = (
  nodeConfig: NodeSandboxOptions | undefined,
  e2bConfig: E2BSandboxOptions | undefined,
) => {
  if (e2bConfig) {
    return `e2b:${e2bConfig.sandboxId ?? "default"}`;
  }

  const workspaceKey = nodeConfig?.workspacePath ?? "default";
  const sandboxIdKey = nodeConfig?.sandboxId ?? "default";
  return `nodejs:${workspaceKey}:${sandboxIdKey}`;
};

export async function getSandbox(
  options: AgentStartOptions,
): Promise<SandboxAPI> {
  const sandboxOptions = options.sandbox;
  const nodeConfig =
    sandboxOptions && sandboxOptions.provider === "nodejs"
      ? sandboxOptions
      : undefined;
  const e2bConfig =
    sandboxOptions && sandboxOptions.provider === "e2b"
      ? sandboxOptions
      : undefined;

  const cacheKey = getCacheKey(nodeConfig, e2bConfig);
  const cached = sandboxCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const sandboxPromise = (async () => {
    if (e2bConfig) {
      if (!e2bConfig.apiKey) {
        throw new AgentStartError(
          "SANDBOX_API_KEY_MISSING",
          "E2B sandbox requires an apiKey to be provided via configuration.",
        );
      }

      if (process.env.E2B_API_KEY !== e2bConfig.apiKey) {
        process.env.E2B_API_KEY = e2bConfig.apiKey;
      }

      if (!e2bConfig.secondaryMemory && !options.secondaryMemory) {
        throw new AgentStartError(
          "SECONDARY_MEMORY_MISSING",
          "E2B sandbox requires secondaryMemory to be provided via configuration or AgentStartOptions.",
        );
      }

      const secondaryMemory =
        e2bConfig.secondaryMemory ?? options.secondaryMemory;

      return E2BSandbox.connectOrCreate({
        secondaryMemory,
        sandboxId: e2bConfig.sandboxId,
        githubToken: e2bConfig.githubToken,
        timeout: e2bConfig.timeout,
        maxLifetime: e2bConfig.maxLifetime,
        ports: e2bConfig.ports,
        runtime: e2bConfig.runtime,
        resources: e2bConfig.resources,
        autoStopDelay: e2bConfig.autoStopDelay,
      });
    }

    const nodeOptions = nodeConfig
      ? {
          workspacePath: nodeConfig.workspacePath,
          timeout: nodeConfig.timeout,
          maxLifetime: nodeConfig.maxLifetime,
          secondaryMemory:
            nodeConfig.secondaryMemory ?? options.secondaryMemory,
        }
      : undefined;

    return NodeSandbox.connectOrCreate(nodeConfig?.sandboxId, nodeOptions);
  })();

  sandboxCache.set(cacheKey, sandboxPromise);

  try {
    return await sandboxPromise;
  } catch (error) {
    sandboxCache.delete(cacheKey);
    throw error;
  }
}
