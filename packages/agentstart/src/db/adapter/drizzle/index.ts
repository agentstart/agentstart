/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Packages tool execution within the AgentStart runtime.
USAGE: Register the "packages" tool when composing the agent configuration to expose this capability.
EXPORTS: Re-exports module symbols
FEATURES:
  - Bridges sandbox APIs into the Packages workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, agentstart, src, db, adapter, drizzle, index, tool, agent, runtime
agent-frontmatter:end */

export * from "./drizzle-adapter";
