/* agent-frontmatter:start
AGENT: Sandbox resolver
PURPOSE: Select and initialize the sandbox instance based on runtime configuration
USAGE: const sandbox = await getSandbox(agentOptions)
EXPORTS: getSandbox
FEATURES:
  - Supports Node.js and E2B sandbox providers
  - Caches initialized sandboxes for reuse
  - Lazy-initializes shared KV connections when required
SEARCHABLE: sandbox resolver, getSandbox, e2b sandbox setup
agent-frontmatter:end */

import { AgentStartError } from "@agentstart/utils";
import { createKV } from "@/kv";
import type { SandboxAPI } from "@/sandbox";
import { E2BSandbox } from "@/sandbox/adapter/e2b";
import { NodeSandbox } from "@/sandbox/adapter/nodejs";
import type {
  AgentStartOptions,
  E2BSandboxOptions,
  NodeSandboxOptions,
} from "@/types";

const sandboxCache = new Map<string, Promise<SandboxAPI>>();
let sharedKV: ReturnType<typeof createKV> | null = null;

const getSharedKV = () => {
  if (!sharedKV) {
    sharedKV = createKV();
  }
  return sharedKV;
};

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

      const kv = e2bConfig.kv ?? getSharedKV();

      return E2BSandbox.connectOrCreate({
        kv,
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
          kv: nodeConfig.kv,
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
