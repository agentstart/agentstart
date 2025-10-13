#!/usr/bin/env node

/* agent-frontmatter:start
AGENT: Agent Stack CLI entrypoint
PURPOSE: Register CLI subcommands and expose the agent-stack executable
USAGE: invoked via `agent-stack` after package installation
EXPORTS: main
FEATURES:
  - Loads package metadata for version reporting
  - Registers generate/migrate/init commands
  - Ensures graceful shutdown on termination signals
SEARCHABLE: cli entrypoint, commander setup, agent-stack binary
agent-frontmatter:end */

import chalk from "chalk";
import { Command } from "commander";
import figlet from "figlet";
import { generate } from "./commands/generate";
import { init } from "./commands/init";
import { migrate } from "./commands/migrate";
import { getPackageInfo } from "./utils/get-package-info";
import "dotenv/config";

// handle exit
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
  console.log(
    chalk.cyan(
      figlet.textSync("AgentStack", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
      }),
    ),
  );

  const program = new Command("agent-stack");
  let packageInfo: Record<string, string> = {};
  try {
    packageInfo = await getPackageInfo();
  } catch {
    // it doesn't matter if we can't read the package.json file, we'll just use an empty object
  }
  program
    .addCommand(migrate)
    .addCommand(generate)
    .addCommand(init)
    .version(packageInfo.version || "1.1.2")
    .description("Agent Stack CLI");
  program.parse();
}

main();
