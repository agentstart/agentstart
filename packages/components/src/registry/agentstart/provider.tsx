/* agent-frontmatter:start
AGENT: AgentStart provider
PURPOSE: Supply the shared AgentStart client instance through React context
USAGE: <AgentStartProvider client={client} navigate={navigate}>{children}</AgentStartProvider>
EXPORTS: AgentStartProvider, AgentStartProviderProps, useAgentStartContext
FEATURES:
  - Shares the thread-capable AgentStart client with all descendant components
  - Provides TanStack Query client for server state management
  - Supplies navigation function for thread routing
  - Wraps children with TooltipProvider for consistent UI
SEARCHABLE: agent provider, context, client, navigation, agentstart
agent-frontmatter:end */

"use client";

import {
  createTanstackQueryUtils,
  type RouterUtils,
} from "@orpc/tanstack-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AgentStartAPI } from "agentstart/api";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AgentStartClientContextState {
  client: AgentStartAPI;
  orpc: RouterUtils<AgentStartAPI>;
  navigate: (path: string) => void;
}
const AgentStartClientContext =
  createContext<AgentStartClientContextState | null>(null);

export interface AgentStartProviderProps {
  client: AgentStartAPI;
  navigate: (path: string) => void;
  children: ReactNode;
}

const queryClient = new QueryClient();

export function AgentStartProvider({
  client,
  navigate,
  children,
}: AgentStartProviderProps) {
  const state = useMemo(() => {
    const orpc = createTanstackQueryUtils(client);

    return {
      client,
      orpc,
      navigate,
    };
  }, [client, navigate]);

  return (
    <AgentStartClientContext.Provider value={state}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider delay={0}>{children}</TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </AgentStartClientContext.Provider>
  );
}

AgentStartProvider.displayName = "AgentStartProvider";

export function useAgentStartContext(): AgentStartClientContextState {
  const context = useContext(AgentStartClientContext);
  if (!context) {
    throw new Error(
      "AgentStart client not found. Wrap your component tree with <AgentStartProvider> or pass a client prop directly.",
    );
  }
  return context;
}
