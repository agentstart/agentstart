/* agent-frontmatter:start
AGENT: Sandbox package exports
PURPOSE: Export sandbox adapters, factories, and utilities
USAGE: import { nodeSandboxAdapter, e2bSandboxAdapter, getSandbox } from "@/sandbox"
EXPORTS: Sandbox adapter factories, getSandbox utility, adapter implementations
FEATURES:
  - Unified sandbox abstraction for local and cloud execution
  - Factory functions for easy configuration
  - Provider implementations (Node.js, E2B)
SEARCHABLE: sandbox exports, nodejs sandbox, e2b sandbox, sandbox factory
agent-frontmatter:end */

export * from "./adapter";
// Adapter factories (recommended usage)
export { e2bSandboxAdapter } from "./adapters/e2b";
export { nodeSandboxAdapter } from "./adapters/nodejs";
export { getSandbox } from "./get-sandbox";
