/* agent-frontmatter:start
AGENT: CLI utility module
PURPOSE: Reads tsconfig.json files and strips comments for configuration analysis.
USAGE: Call to load TypeScript project settings during CLI setup.
EXPORTS: stripJsonComments, getTsconfigInfo
FEATURES:
  - Removes comments and trailing commas from tsconfig JSON
  - Supports resolving tsconfig paths relative to the working directory
SEARCHABLE: packages, cli, src, utils, get, tsconfig, info, parser
agent-frontmatter:end */

import path from "node:path";
import fs from "fs-extra";

export function stripJsonComments(jsonString: string): string {
  return jsonString
    .replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) =>
      g ? "" : m,
    )
    .replace(/,(?=\s*[}\]])/g, "");
}

export function getTsconfigInfo(cwd?: string) {
  const packageJsonPath = cwd
    ? path.join(cwd, "tsconfig.json")
    : path.join("tsconfig.json");
  const text = fs.readFileSync(packageJsonPath, "utf-8");
  return JSON.parse(stripJsonComments(text));
}
