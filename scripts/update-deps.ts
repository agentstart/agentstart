/* agent-frontmatter:start
AGENT: Dependency maintenance helper
PURPOSE: Sort workspace catalog entries and update dependency versions
USAGE: bun run scripts/update-deps.ts
EXPORTS: sortWorkspaceCatalog
FEATURES:
  - Normalizes workspaces.catalog ordering
  - Delegates dependency upgrades to npm-check-updates via bunx
SEARCHABLE: dependency upgrade, workspace catalog, ncu helper
agent-frontmatter:end */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execa } from "execa";
import { readFile, writeFile } from "fs-extra";

export type WorkspaceCatalog = Record<string, string>;

interface PackageJson {
  workspaces?: {
    catalog?: WorkspaceCatalog;
  };
}

export function sortWorkspaceCatalog(catalog: WorkspaceCatalog): WorkspaceCatalog {
  return Object.fromEntries(
    Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)),
  );
}

const packageJsonPath = resolve(process.cwd(), "package.json");

async function normalizeWorkspaceCatalog() {
  const rawContent = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(rawContent) as PackageJson;

  const catalog = packageJson?.workspaces?.catalog;
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    return false;
  }

  const sortedCatalog = sortWorkspaceCatalog(catalog);
  const isAlreadySorted =
    JSON.stringify(catalog) === JSON.stringify(sortedCatalog);

  if (!isAlreadySorted) {
    packageJson.workspaces = {
      ...(packageJson.workspaces ?? {}),
      catalog: sortedCatalog,
    };
    const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;
    if (nextContent !== rawContent) {
      await writeFile(packageJsonPath, nextContent, "utf8");
    }
  }

  return !isAlreadySorted;
}

async function runDependencyUpgrade() {
  try {
    await execa("bunx", ["ncu", "-i", "-p", "bun", "-w"], {
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(
      `Dependency upgrade failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

async function main() {
  try {
    const sorted = await normalizeWorkspaceCatalog();
    if (sorted) {
      console.log("Sorted workspaces.catalog entries.");
    }
    await runDependencyUpgrade();
  } catch (error) {
    console.error("update-deps encountered an error:", error);
    process.exit(1);
  }
}

const isCliExecution = (() => {
  try {
    const entry = process.argv[1];
    if (!entry) return false;
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (isCliExecution) {
  void main();
}
