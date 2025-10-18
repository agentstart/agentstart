/* agent-frontmatter:start
AGENT: Agent client factory
PURPOSE: Create a typed oRPC client and thread hook for the Agent Start API
USAGE: const { client, useThread } = createAgentClient()
EXPORTS: createAgentClient, CreateAgentClientOptions, CreateAgentClientResult
FEATURES:
  - Configures an oRPC RPCLink with sensible defaults
  - Exposes a ready-to-use `useThread` hook bound to the client
SEARCHABLE: agent client factory, orpc client, createAgentClient
agent-frontmatter:end */

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@/api";
import { type AgentClientConfig, getClientConfig } from "./config";
import { createUseThread } from "./use-thread";

type HeaderInitFactory =
  | (() => Record<string, string>)
  | (() => Promise<Record<string, string>>);

export interface CreateAgentClientOptions extends AgentClientConfig {
  /**
   * Optionally allow the helper to load environment variables for base URL.
   * Defaults to true to maintain backwards compatibility with the CLI template.
   */
  loadEnv?: boolean;
  /**
   * Optional hook to provide custom headers for every RPC call.
   */
  headers?: HeaderInitFactory;
  /**
   * Provide a custom fetch implementation (useful for SSR/polyfills).
   */
  fetch?: typeof fetch;
}

export interface CreateAgentClientResult {
  client: RouterClient<AppRouter>;
  useThread: ReturnType<typeof createUseThread>;
  baseURL: string;
}

export function createAgentClient(
  options: CreateAgentClientOptions = {},
): CreateAgentClientResult {
  const { baseURL } = getClientConfig(options, options.loadEnv ?? true);
  const normalizedBaseURL = baseURL.endsWith("/")
    ? baseURL.slice(0, -1)
    : baseURL;
  const rpcLink = new RPCLink({
    url: `${normalizedBaseURL}/rpc`,
    headers: options.headers,
    fetch: options.fetch,
  });

  const client = createORPCClient(
    rpcLink,
  ) as unknown as RouterClient<AppRouter>;

  return {
    client,
    useThread: createUseThread(client),
    baseURL: normalizedBaseURL,
  };
}
