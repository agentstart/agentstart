/* agent-frontmatter:start
AGENT: Playground provider component
PURPOSE: Client component that syncs AgentStart provider with TanStack Router navigation.
USAGE: Wrap ancestors to supply agent client instance and thread-aware layout.
EXPORTS: Provider
FEATURES:
  - Uses TanStack Router state to hydrate threadId
  - Injects AgentStartProvider with the preconfigured client
SEARCHABLE: playground, tanstack, app, provider, agentstart
agent-frontmatter:end */

"use client";

import { useParams, useRouter } from "@tanstack/react-router";
import { AgentStartProvider } from "agentstart/client";
import type React from "react";
import { client } from "@/lib/agent-client";

interface ProviderProps {
  children?: React.ReactNode;
}
export function Provider({ children }: ProviderProps) {
  const router = useRouter();
  const { threadId } = useParams({ strict: false });

  const navigate = (path: string) => {
    router.navigate({ to: path });
  };

  return (
    <AgentStartProvider
      defaultTheme="light"
      client={client}
      navigate={navigate}
      getThreadId={() => threadId}
    >
      {children}
    </AgentStartProvider>
  );
}
