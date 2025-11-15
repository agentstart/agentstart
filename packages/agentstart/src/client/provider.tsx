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
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { AgentStartAPI } from "../api";
import type { AppConfig } from "../api/routers/config";
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
  threadId: string | undefined;
  setThreadId: (threadId: string | undefined) => void;
  config: AppConfig | undefined;
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

// Inner component that fetches config and provides context to children
function AgentStartProviderInner({
  client,
  navigate,
  stores,
  children,
}: AgentStartProviderProps) {
  const [threadId, setThreadId] = useState<string | undefined>();

  // Fetch app configuration once at the provider level with 30 min cache
  const orpcUtils = useMemo(() => createTanstackQueryUtils(client), [client]);
  const configQuery = useQuery(
    orpcUtils.config.get.queryOptions({
      staleTime: 30 * 60 * 1000, // 30 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
    }),
  );

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
    return {
      client,
      orpc: orpcUtils,
      navigate,
      threadId,
      setThreadId,
      config: configQuery.data,
    };
  }, [client, orpcUtils, navigate, threadId, configQuery.data]);

  useEffect(() => {
    return () => {
      storeInstancesRef.current.clear();
    };
  }, []);

  return (
    <StoreRegistryContext.Provider value={storeRegistryState}>
      <AgentStartClientContext.Provider value={clientState}>
        {children}
      </AgentStartClientContext.Provider>
    </StoreRegistryContext.Provider>
  );
}

export function AgentStartProvider({
  client,
  navigate,
  stores,
  children,
}: AgentStartProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="agentstart-theme">
        <AgentStartProviderInner
          client={client}
          navigate={navigate}
          stores={stores}
        >
          {children}
        </AgentStartProviderInner>
      </ThemeProvider>
    </QueryClientProvider>
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
