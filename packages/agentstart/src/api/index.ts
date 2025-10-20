/* agent-frontmatter:start
AGENT: API package main export (oRPC)
PURPOSE: Export oRPC routers and utilities
USAGE:
  - oRPC: import { router as orpcRouter } from '@agentstart/api'
EXPORTS:
  - oRPC exports
SEARCHABLE: api package, router exports, orpc
agent-frontmatter:end */

export * from "./context";
export * from "./get-api";
export * from "./procedures";
// oRPC exports (new API)
export * from "./router";
