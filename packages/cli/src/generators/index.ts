/* agent-frontmatter:start
AGENT: Agent runtime tool module
PURPOSE: Implements Packages tool execution within the AgentStart runtime.
USAGE: Register the "packages" tool when composing the agent configuration to expose this capability.
EXPORTS: adapters, getGenerator
FEATURES:
  - Bridges sandbox APIs into the Packages workflow
  - Streams structured progress updates and normalizes tool output
SEARCHABLE: packages, cli, src, generators, index, tool, agent, runtime
agent-frontmatter:end */

import { logger } from "@agentstart/utils";
import type { Adapter, AgentStartOptions } from "agentstart";
import { generateDrizzleSchema } from "./drizzle";
import { generateMigrations } from "./kysely";
import { generatePrismaSchema } from "./prisma";

export const adapters = {
  prisma: generatePrismaSchema,
  drizzle: generateDrizzleSchema,
  kysely: generateMigrations,
};

export const getGenerator = (opts: {
  adapter: Adapter;
  file?: string;
  options: AgentStartOptions;
}) => {
  const adapter = opts.adapter;
  const generator =
    adapter.id in adapters
      ? adapters[adapter.id as keyof typeof adapters]
      : null;
  if (!generator) {
    logger.error(`${adapter.id} is not supported.`);
    process.exit(1);
  }
  return generator(opts);
};
