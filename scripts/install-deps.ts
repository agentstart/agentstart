/* agent-frontmatter:start
AGENT: Dependency installer helper
PURPOSE: Interactively add workspace dependencies and sync catalog versions
USAGE: bun run tsx scripts/install-deps.ts
EXPORTS: none
FEATURES:
  - Guides selection of target workspace package
  - Validates dependency name and resolves latest version
  - Writes catalog-referenced entry into package manifest
  - Updates root workspaces.catalog with sorted latest specs
  - Runs bun install when manifests change
SEARCHABLE: install deps, workspace catalog, clack prompts workflow
agent-frontmatter:end */

import { dirname, relative, resolve } from "node:path";
import {
  cancel,
  intro,
  isCancel,
  log,
  outro,
  select,
  text,
} from "@clack/prompts";
import { execa } from "execa";
import fg from "fast-glob";
import { readFile, writeFile } from "fs-extra";

import { sortWorkspaceCatalog, type WorkspaceCatalog } from "./update-deps";

const rootDir = process.cwd();
const rootPackageJsonPath = resolve(rootDir, "package.json");

type DependencyGroup = "dependencies" | "devDependencies";

interface RootPackageJson {
  workspaces?: {
    catalog?: WorkspaceCatalog;
    packages?: string[] | undefined;
  };
  [key: string]: unknown;
}

interface WorkspacePackage {
  name: string;
  dir: string;
  packageJsonPath: string;
}

async function fetchLatestVersion(pkg: string): Promise<string> {
  try {
    const { stdout } = await execa("npm", ["view", pkg, "version", "--json"]);
    return JSON.parse(stdout) as string;
  } catch (error) {
    throw new Error(
      `Failed to resolve latest version for ${pkg}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function getDependencyName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const slashIndex = specifier.indexOf("/");
    if (slashIndex === -1) {
      return specifier;
    }
    const versionSeparator = specifier.indexOf("@", slashIndex);
    if (versionSeparator === -1) {
      return specifier;
    }
    return specifier.slice(0, versionSeparator);
  }
  const versionSeparator = specifier.indexOf("@");
  return versionSeparator === -1
    ? specifier
    : specifier.slice(0, versionSeparator);
}

function deriveSpec(current: string | undefined, version: string): string {
  if (!current || current.trim().length === 0) {
    return `^${version}`;
  }

  const trimmed = current.trim();
  if (trimmed.startsWith("^") || trimmed.startsWith("~")) {
    return `${trimmed[0]}${version}`;
  }

  const operatorMatch = trimmed.match(/^(>=|<=|>|<|=)/);
  if (operatorMatch) {
    return `${operatorMatch[0]}${version}`;
  }

  return version;
}

function sortRecord(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}

async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  let workspacePatterns: string[] = [];

  try {
    const rawRootPackageJson = await readFile(rootPackageJsonPath, "utf8");
    const rootPackageJson = JSON.parse(rawRootPackageJson) as RootPackageJson;
    if (Array.isArray(rootPackageJson.workspaces?.packages)) {
      workspacePatterns = rootPackageJson.workspaces.packages.filter(
        (pattern): pattern is string =>
          typeof pattern === "string" && pattern.trim().length > 0,
      );
    }
  } catch (error) {
    log.error(
      `Failed to read root workspaces from ${rootPackageJsonPath}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return [];
  }

  if (workspacePatterns.length === 0) {
    log.error("No workspace package patterns defined in workspaces.packages.");
    return [];
  }

  const manifestPatterns = workspacePatterns
    .map((pattern) => {
      const trimmed = pattern.trim();
      if (trimmed.length === 0) return null;

      const isNegated = trimmed.startsWith("!");
      const withoutNegation = isNegated ? trimmed.slice(1) : trimmed;
      const normalized = withoutNegation.replace(/\/+$/, "");
      const withManifest = normalized.endsWith("package.json")
        ? normalized
        : `${normalized}/package.json`;

      return isNegated ? `!${withManifest}` : withManifest;
    })
    .filter((pattern): pattern is string => Boolean(pattern));

  const manifestPaths = await fg(manifestPatterns, {
    cwd: rootDir,
    absolute: true,
    unique: true,
  });

  const packages: WorkspacePackage[] = [];

  for (const manifestPath of manifestPaths) {
    try {
      const content = await readFile(manifestPath, "utf8");
      const parsed = JSON.parse(content) as { name?: string };
      const packageDir = dirname(manifestPath);
      const relativeDir = relative(rootDir, packageDir) || ".";

      packages.push({
        name: parsed.name ?? relativeDir,
        dir: relativeDir,
        packageJsonPath: manifestPath,
      });
    } catch {
      // ignore malformed package.json files
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

async function promptForPackage(packages: WorkspacePackage[]) {
  const selected = await select<WorkspacePackage>({
    message: "Select the workspace package to update",
    options: packages.map((pkg) => ({
      label: `${pkg.name} (${pkg.dir})`,
      value: pkg,
    })),
  });

  if (isCancel(selected)) {
    cancel("Dependency installation cancelled.");
    process.exit(0);
  }

  return selected;
}

async function promptForDependencyNames() {
  const dependencyInput = await text({
    message: "Enter the dependency name(s)",
    placeholder: "Example: react, @scope/pkg or react @scope/pkg",
    validate: (value) => {
      if (!value || !value.trim()) {
        return "Dependency name cannot be empty";
      }
      return;
    },
  });

  if (isCancel(dependencyInput)) {
    cancel("Dependency installation cancelled.");
    process.exit(0);
  }

  const dependencies = dependencyInput
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (dependencies.length === 0) {
    log.error("No valid dependency names provided.");
    process.exit(1);
  }

  const uniqueDependencies = Array.from(
    new Set(dependencies.map((entry) => getDependencyName(entry))),
  ).filter(Boolean);

  if (uniqueDependencies.length === 0) {
    log.error("Failed to derive dependency names from the provided input.");
    process.exit(1);
  }

  return uniqueDependencies;
}

async function promptForDependencyGroup(): Promise<DependencyGroup> {
  const group = await select<DependencyGroup>({
    message: "Which field should receive the dependency?",
    options: [
      { label: "dependencies", value: "dependencies" },
      { label: "devDependencies", value: "devDependencies" },
    ],
  });

  if (isCancel(group)) {
    cancel("Dependency installation cancelled.");
    process.exit(0);
  }

  return group;
}

async function updateWorkspacePackage(
  target: WorkspacePackage,
  dependencies: string[],
  group: DependencyGroup,
): Promise<boolean> {
  const rawPackageJson = await readFile(target.packageJsonPath, "utf8");
  const packageJson = JSON.parse(rawPackageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
  };

  const bucket =
    group === "dependencies"
      ? { key: "dependencies" as const, value: packageJson.dependencies ?? {} }
      : {
          key: "devDependencies" as const,
          value: packageJson.devDependencies ?? {},
        };

  const currentRecord = { ...bucket.value };
  const addedDependencies: string[] = [];

  for (const dependency of dependencies) {
    if (currentRecord[dependency] === "catalog:") {
      log.info(
        `${target.name}: ${group} already includes ${dependency}@catalog:, skipping.`,
      );
      continue;
    }

    currentRecord[dependency] = "catalog:";
    addedDependencies.push(dependency);
    log.success(`${target.name}: queued ${dependency}@catalog: for ${group}.`);
  }

  if (addedDependencies.length === 0) {
    log.info(
      `${target.name}: ${group} already contains all requested dependencies.`,
    );
    return false;
  }

  const nextRecord = sortRecord(currentRecord);

  if (bucket.key === "dependencies") {
    packageJson.dependencies = nextRecord;
  } else {
    packageJson.devDependencies = nextRecord;
  }

  const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;
  if (nextContent === rawPackageJson) {
    log.info(`${target.name}: package.json unchanged.`);
    return false;
  }

  await writeFile(target.packageJsonPath, nextContent, "utf8");
  log.success(
    `${target.name}: wrote ${addedDependencies.join(", ")}@catalog: to ${group}.`,
  );
  return true;
}

async function updateCatalogEntries(
  dependencies: string[],
  resolvedVersions: Record<string, string>,
) {
  const rawPackageJson = await readFile(rootPackageJsonPath, "utf8");
  const packageJson = JSON.parse(rawPackageJson) as RootPackageJson;
  const catalog: WorkspaceCatalog = {
    ...(packageJson.workspaces?.catalog ?? {}),
  };

  let updated = false;
  let contentChanged = false;

  for (const input of dependencies) {
    const name = getDependencyName(input);
    if (!name) {
      log.warn(`Skipping empty dependency name: ${input}`);
      continue;
    }

    const latestVersion =
      resolvedVersions[name] ?? (await fetchLatestVersion(name));
    const nextSpec = deriveSpec(catalog[name], latestVersion);

    if (catalog[name] === nextSpec) {
      log.info(`• ${name} already at latest ${nextSpec}`);
      continue;
    }

    catalog[name] = nextSpec;
    updated = true;
    log.info(`• ${name} -> ${nextSpec}`);
  }

  packageJson.workspaces = {
    ...(packageJson.workspaces ?? {}),
    catalog: sortWorkspaceCatalog(catalog),
  };

  const nextContent = `${JSON.stringify(packageJson, null, 2)}\n`;

  if (nextContent !== rawPackageJson) {
    await writeFile(rootPackageJsonPath, nextContent, "utf8");
    contentChanged = true;
    log.success("Updated root package.json workspaces.catalog.");
  }

  if (!updated && !contentChanged) {
    log.info("No workspaces.catalog changes required.");
  }

  return contentChanged;
}

async function runBunInstall() {
  await execa("bun", ["install"], {
    stdio: "inherit",
  });
}

async function main() {
  try {
    intro("Agent Start dependency installation");

    const packages = await getWorkspacePackages();
    if (packages.length === 0) {
      log.error("No valid workspace packages found under packages/.");
      process.exit(1);
    }

    const targetPackage = await promptForPackage(packages);
    const dependencyNames = await promptForDependencyNames();

    const resolvedVersions: Record<string, string> = {};

    for (const dependencyName of dependencyNames) {
      try {
        const latestVersion = await fetchLatestVersion(dependencyName);
        resolvedVersions[dependencyName] = latestVersion;
        log.info(`Resolved ${dependencyName}@${latestVersion}`);
      } catch (error) {
        log.error(
          `Failed to resolve the latest version for ${dependencyName}. Please confirm the package name.`,
        );
        log.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }

    const dependencyGroup = await promptForDependencyGroup();

    const packageUpdated = await updateWorkspacePackage(
      targetPackage,
      dependencyNames,
      dependencyGroup,
    );

    const catalogUpdated = await updateCatalogEntries(
      dependencyNames,
      resolvedVersions,
    );

    if (packageUpdated || catalogUpdated) {
      await runBunInstall();
      outro("Dependency installation complete and manifests synced.");
    } else {
      outro("No changes detected. Nothing to install.");
    }
  } catch (error) {
    console.error("install-deps encountered an error:", error);
    process.exit(1);
  }
}

void main();
