/* agent-frontmatter:start
AGENT: Kysely adapter entry point
PURPOSE: Re-export the Kysely adapter and dialect helpers for the AgentStart memory module.
USAGE: import { kyselyAdapter } from "agentstart/memory"
EXPORTS: createKyselyAdapter, kyselyAdapter
FEATURES:
  - Provides SQL dialect detection for Kysely-backed storage
  - Normalizes agent memory operations across supported databases
SEARCHABLE: packages, agentstart, src, memory, adapter, kysely, index
agent-frontmatter:end */

export * from "./dialect";
export * from "./kysely-adapter";
