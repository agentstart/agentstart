/* agent-frontmatter:start
AGENT: Agent Stack CLI package metadata helper
PURPOSE: Read package.json details for version and description reporting
USAGE: const pkg = getPackageInfo(cwd)
EXPORTS: getPackageInfo
FEATURES:
  - Resolves package.json relative to provided cwd
  - Delegates to fs-extra for JSON parsing
  - Supports CLI version reporting without extra deps
SEARCHABLE: package info, cli utils, version helper
agent-frontmatter:end */

import path from "node:path";
import fs from "fs-extra";

export function getPackageInfo(cwd?: string) {
  const packageJsonPath = cwd
    ? path.join(cwd, "package.json")
    : path.join("package.json");
  return fs.readJSONSync(packageJsonPath);
}
