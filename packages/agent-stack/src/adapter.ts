/* agent-frontmatter:start
AGENT: Adapter module re-export
PURPOSE: Maintain adapter entry point compatibility after package extraction
USAGE: import { createAdapter } from "agent-stack/adapter"
EXPORTS: infrastructure adapters, adapter utilities
FEATURES:
  - Re-exports @agent-stack/infra adapter workspace entry
  - Keeps consumer imports stable across package restructuring
SEARCHABLE: agent adapter, adapter re-export, infra bridge
agent-frontmatter:end */

export * from "@agent-stack/infra/adapter";
