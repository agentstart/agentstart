/* agent-frontmatter:start
AGENT: Sandbox resolver
PURPOSE: Resolve SandboxAPI instance from AgentStartOptions configuration
USAGE: const sandbox = await getSandbox(agentOptions)
EXPORTS: getSandbox
FEATURES:
  - Accepts SandboxAPI instance or SandboxAdapterFactory
  - Defaults to Node.js sandbox if no configuration provided
  - Caches initialized sandboxes for reuse
SEARCHABLE: sandbox resolver, getSandbox, sandbox initialization
agent-frontmatter:end */

import type { AgentStartOptions, SandboxAPI } from "@agentstart/types";
import { nodeSandboxAdapter } from "./factory/nodejs";

const sandboxCache = new WeakMap<
  (options: AgentStartOptions) => Promise<SandboxAPI> | SandboxAPI,
  Promise<SandboxAPI>
>();

export async function getSandbox(
  options: AgentStartOptions,
): Promise<SandboxAPI> {
  if (!options.sandbox) {
    // Default to Node.js sandbox
    const defaultFactory = nodeSandboxAdapter();
    return defaultFactory(options);
  }

  // If already a SandboxAPI instance
  if (isSandboxAPI(options.sandbox)) {
    return options.sandbox;
  }

  // If it's a factory function
  const factory = options.sandbox;
  const cached = sandboxCache.get(factory);
  if (cached) {
    return cached;
  }

  const promise = Promise.resolve(factory(options));
  sandboxCache.set(factory, promise);

  try {
    return await promise;
  } catch (error) {
    sandboxCache.delete(factory);
    throw error;
  }
}

function isSandboxAPI(value: unknown): value is SandboxAPI {
  return (
    typeof value === "object" &&
    value !== null &&
    "fs" in value &&
    "bash" in value &&
    "git" in value
  );
}
