/* agent-frontmatter:start
AGENT: Client module re-export
PURPOSE: Keep agent-stack/client entry point aligned after package split
USAGE: import { createAgentClient } from "agent-stack/client"
EXPORTS: client utilities, state stores
FEATURES:
  - Re-exports @agent-stack/client workspace entry
  - Preserves backwards-compatible import path for consumers
SEARCHABLE: agent client, client re-export, compatibility bridge
agent-frontmatter:end */

export * from "@agent-stack/client";
