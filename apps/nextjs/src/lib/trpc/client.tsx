// AGENT: Client-side tRPC setup with React Query
// PURPOSE: Provides tRPC client for React components
// USAGE: 
//   - Wrap app with <TRPCReactProvider>
//   - Use hooks: trpc.example.hello.useQuery()
// EXPORTS: trpc (hooks), TRPCReactProvider (wrapper)
// SEARCHABLE: trpc client, react query, api hooks

"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@acme/api";

import { createQueryClient } from "./query-client";

// AGENT: tRPC React hooks instance
// USAGE: trpc.[router].[procedure].useQuery() or .useMutation()
export const trpc = createTRPCReact<AppRouter>();
let clientQueryClientSingleton: QueryClient;
function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
}
function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    return "http://localhost:3000";
  })();
  return `${base}/api/trpc`;
}
// AGENT: Provider component for tRPC and React Query
// USAGE: Wrap your app or layout with this provider
// EXAMPLE: <TRPCReactProvider>{children}</TRPCReactProvider>
export function TRPCReactProvider(
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: getUrl(),
        }),
      ],
    }),
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
