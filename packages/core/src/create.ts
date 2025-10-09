import type { DatabaseAdapterInstance } from "./adapters";
import type { Agent } from "./agent";

export interface CreateAgentOptions {
  baseURL?: string;
  basePath?: `/${string}`;
  memory?: DatabaseAdapterInstance<unknown>;
  instance: Agent;
}

export function createAgent(options: CreateAgentOptions) {
  return options;
}
