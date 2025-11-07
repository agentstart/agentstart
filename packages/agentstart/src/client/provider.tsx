/* agent-frontmatter:start
AGENT: AgentStart provider
PURPOSE: Supply the shared AgentStart client instance and store registry through React context
USAGE: <AgentStartProvider client={client} navigate={navigate}>{children}</AgentStartProvider>
EXPORTS: AgentStartProvider, AgentStartProviderProps, useAgentStartContext, useStoreRegistry
FEATURES:
  - Shares the thread-capable AgentStart client with all descendant components
  - Manages Zustand store instances lifecycle via store registry
  - Provides TanStack Query client for server state management
  - Supplies navigation function for thread routing
  - Cleans up all store instances on unmount
SEARCHABLE: agent provider, context, client, navigation, agentstart, store registry
agent-frontmatter:end */

"use client";

import {
  createTanstackQueryUtils,
  type RouterUtils,
} from "@orpc/tanstack-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AgentStartAPI } from "../api";
import type { AgentStoreWithSync } from "./store/agent";
import { ThemeProvider } from "./theme-provider";

// Store registry context for managing Zustand store instances
interface StoreRegistryContextState {
  storeInstances: Map<string, UseBoundStore<StoreApi<AgentStoreWithSync<any>>>>;
}

const StoreRegistryContext = createContext<StoreRegistryContextState | null>(
  null,
);

// Client context for sharing AgentStart client instance
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
  stores?: Map<string, UseBoundStore<StoreApi<AgentStoreWithSync<any>>>>;
  children: ReactNode;
}

const queryClient = new QueryClient();

export function AgentStartProvider({
  client,
  navigate,
  stores,
  children,
}: AgentStartProviderProps) {
  // Store registry for managing Zustand store instances
  const storeInstancesRef = useRef<
    Map<string, UseBoundStore<StoreApi<AgentStoreWithSync<any>>>>
  >(stores ?? new Map());

  const storeRegistryState = useMemo(
    () => ({
      storeInstances: storeInstancesRef.current,
    }),
    [],
  );

  const clientState = useMemo(() => {
    const orpc = createTanstackQueryUtils(client);

    return {
      client,
      orpc,
      navigate,
    };
  }, [client, navigate]);

  // Cleanup all store instances on unmount
  useEffect(() => {
    return () => {
      storeInstancesRef.current.clear();
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="agentstart-theme">
      <StoreRegistryContext.Provider value={storeRegistryState}>
        <AgentStartClientContext.Provider value={clientState}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </AgentStartClientContext.Provider>
      </StoreRegistryContext.Provider>
    </ThemeProvider>
  );
}

AgentStartProvider.displayName = "AgentStartProvider";

export function useStoreRegistry(): Map<
  string,
  UseBoundStore<StoreApi<AgentStoreWithSync<any>>>
> {
  const context = useContext(StoreRegistryContext);
  if (!context) {
    throw new Error(
      "Store registry not found. Wrap your component tree with <AgentStartProvider>.",
    );
  }
  return context.storeInstances;
}

export function useAgentStartContext(): AgentStartClientContextState {
  const context = useContext(AgentStartClientContext);
  if (!context) {
    throw new Error(
      "AgentStart client not found. Wrap your component tree with <AgentStartProvider>.",
    );
  }
  return context;
}
