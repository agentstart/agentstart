/* agent-frontmatter:start
AGENT: CLI utility module
PURPOSE: Installs dependencies via the selected package manager for generated projects.
USAGE: Invoke after scaffolding to install required packages.
EXPORTS: installDependencies
FEATURES:
  - Supports npm, pnpm, bun, and yarn install flows
  - Executes installs in a specified working directory
SEARCHABLE: packages, cli, src, utils, install, dependencies
agent-frontmatter:end */

import { exec } from "node:child_process";

export function installDependencies({
  dependencies,
  packageManager,
  cwd,
}: {
  dependencies: string[];
  packageManager: "npm" | "pnpm" | "bun" | "yarn";
  cwd: string;
}): Promise<boolean> {
  let installCommand: string;
  switch (packageManager) {
    case "npm":
      installCommand = "npm install --force";
      break;
    case "pnpm":
      installCommand = "pnpm install";
      break;
    case "bun":
      installCommand = "bun install";
      break;
    case "yarn":
      installCommand = "yarn install";
      break;
    default:
      throw new Error("Invalid package manager");
  }
  const command = `${installCommand} ${dependencies.join(" ")}`;

  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr));
        return;
      }
      resolve(true);
    });
  });
}
