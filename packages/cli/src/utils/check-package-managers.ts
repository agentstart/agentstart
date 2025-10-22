/* agent-frontmatter:start
AGENT: CLI utility module
PURPOSE: Detects availability of user package managers to tailor install instructions.
USAGE: Call before installing dependencies to prefer pnpm or bun when available.
EXPORTS: None
FEATURES:
  - Executes version checks for pnpm and bun commands
  - Resolves command availability asynchronously
SEARCHABLE: packages, cli, src, utils, check, package, managers, manager
agent-frontmatter:end */

import { exec } from "node:child_process";

function checkCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`${command} --version`, (error) => {
      if (error) {
        resolve(false); // Command not found or error occurred
      } else {
        resolve(true); // Command exists
      }
    });
  });
}

export async function checkPackageManagers(): Promise<{
  hasPnpm: boolean;
  hasBun: boolean;
}> {
  const hasPnpm = await checkCommand("pnpm");
  const hasBun = await checkCommand("bun");

  return {
    hasPnpm,
    hasBun,
  };
}
