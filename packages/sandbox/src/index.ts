/* agent-frontmatter:start
AGENT: Sandbox package exports
PURPOSE: Export sandbox types and utilities (types only, no adapters)
USAGE: import { getSandbox } from "@agentstart/sandbox"
EXPORTS: getSandbox utility, Sandbox types
FEATURES:
  - Unified sandbox abstraction for local and cloud execution
  - Type-safe configuration
  - For adapters, use granular imports: @agentstart/sandbox/nodejs, @agentstart/sandbox/e2b
SEARCHABLE: sandbox exports, sandbox types, sandbox utility
agent-frontmatter:end */

export { getSandbox } from "./get-sandbox";
