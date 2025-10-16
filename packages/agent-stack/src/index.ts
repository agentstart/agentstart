/* agent-frontmatter:start
AGENT: Agent Stack public entry
PURPOSE: Re-export the core agent API surface from the aggregate package
USAGE: import { Agent } from "agent-stack"
EXPORTS: agent runtime, configuration helpers
FEATURES:
  - Bridges the core agent package into the batteries-included bundle
  - Keeps external imports stable across templates
SEARCHABLE: agent stack entry, public api, agent exports
agent-frontmatter:end */

export * from "@agent-stack/agent";
