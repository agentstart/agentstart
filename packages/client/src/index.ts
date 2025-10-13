/* agent-frontmatter:start
AGENT: Agent client factory
PURPOSE: Configure oRPC client instances for Agent Stack APIs
USAGE: createAgentClient({ baseURL })
EXPORTS: createAgentClient
FEATURES:
  - Automatic AppRouter typing
  - Client-friendly authentication header wiring
  - Base URL resolution via getClientConfig
SEARCHABLE: agent client, orpc client, api client, rpc client
agent-frontmatter:end */

import type { AppRouter } from "@agent-stack/api";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { type AgentClientConfig, getClientConfig } from "./config";
import { createUseChat } from "./use-chat";

export function createAgentClient(config?: AgentClientConfig) {
  const { baseURL } = getClientConfig(config);

  const link = new RPCLink({
    url: () => baseURL,
  });

  // Create the client with proper typing
  const client: RouterClient<AppRouter> = createORPCClient(link);

  const useChat = createUseChat(client);

  return { client, useChat };
}

export * from "./store";
