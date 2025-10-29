/* agent-frontmatter:start
AGENT: MongoDB adapter entry point
PURPOSE: Re-export the MongoDB adapter for the AgentStart memory module.
USAGE: import { mongodbAdapter } from "agentstart/memory"
EXPORTS: mongodbAdapter
FEATURES:
  - Provides MongoDB persistence wiring for agent memory
  - Handles collection access and BSON value normalization
SEARCHABLE: packages, agentstart, src, memory, adapter, mongodb, index
agent-frontmatter:end */

export * from "./mongodb-adapter";
