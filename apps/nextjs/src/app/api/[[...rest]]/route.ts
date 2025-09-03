// AGENT: oRPC route handler for Next.js App Router
// PURPOSE: Handle all oRPC API requests with automatic REST support
// USAGE: All /api/* requests are handled by this route
// FEATURES:
//   - Handles both RPC and REST requests
//   - Automatic OpenAPI support
//   - Context creation with auth and database
//   - Support for all HTTP methods
// SEARCHABLE: orpc route, api handler, next.js route

import { RPCHandler } from "@orpc/server/fetch";
import { appRouter, createContext } from "@acme/api";
import { auth } from "@/lib/auth/server";
import { db } from "@acme/db/client";

// Create the RPC handler
const handler = new RPCHandler(appRouter);

// Handler function for all HTTP methods
async function handleRequest(request: Request) {
  // Create context for the request
  const ctx = await createContext({
    db,
    auth,
    headers: new Headers(request.headers),
  });

  // Handle the request with context
  const { response } = await handler.handle(request, {
    prefix: "/api",
    context: ctx,
  });

  return response ?? new Response("Not found", { status: 404 });
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const HEAD = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
