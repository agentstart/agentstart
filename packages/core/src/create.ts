/* agent-frontmatter:start
AGENT: Agent factory options
PURPOSE: Provide helpers for wiring agent instances to integrations
USAGE: const agent = createAgent({ instance, memory })
EXPORTS: createAgent, CreateAgentOptions
FEATURES:
  - Normalizes configuration shared by runtime adapters
  - Allows custom persistence adapters
SEARCHABLE: agent factory, agent options, integration config
agent-frontmatter:end */

import type { Agent } from "./agent";

export interface CreateAgentOptions {
  baseURL?: string;
  basePath?: `/${string}`;
  instance: Agent;
}

export function createAgent(options: CreateAgentOptions) {
  return options;
}
