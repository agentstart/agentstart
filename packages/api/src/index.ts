// AGENT: tRPC API package main export
// PURPOSE: Export tRPC router and type inference helpers
// USAGE: import { appRouter, type AppRouter } from '@acme/api'
// EXPORTS:
//   - appRouter: Main tRPC router instance
//   - AppRouter: Router type for client
//   - RouterInputs/RouterOutputs: Type inference helpers
// SEARCHABLE: trpc api, api package, router exports

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";
import { appRouter } from "./root";

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { appRouter };
export type { AppRouter, RouterInputs, RouterOutputs };

export * from "./trpc";
