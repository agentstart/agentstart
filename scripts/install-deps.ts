/* agent-frontmatter:start
AGENT: Dependency installer helper
PURPOSE: Interactively add workspace dependencies and sync catalog versions
USAGE: pnpm tsx scripts/install-deps.ts
EXPORTS: none
FEATURES:
  - Guides selection of target workspace package
  - Validates dependency name and resolves latest version
  - Writes catalog-referenced entry into package manifest
  - Updates root workspaces.catalog with sorted latest specs
  - Runs pnpm install when manifests change
SEARCHABLE: install deps, workspace catalog, clack prompts workflow
agent-frontmatter:end */

import { spawn } from "node:child_process";
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
import fg from "fast-glob";
import { readFile, writeFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

type WorkspaceCatalog = Record<string, string>;

interface PnpmWorkspaceConfig extends Record<string, unknown> {
  packages?: unknown;
  catalogs?: unknown;
}

interface WorkspaceFileSnapshot {
  config: PnpmWorkspaceConfig;
  packages: string[];
  catalog: WorkspaceCatalog;
}

type WorkspaceSnapshotCache = WorkspaceFileSnapshot | null;

let workspaceSnapshotCache: WorkspaceSnapshotCache | undefined;

const pnpmWorkspacePath = resolve(process.cwd(), "pnpm-workspace.yaml");

function sortWorkspaceCatalog(catalog: WorkspaceCatalog): WorkspaceCatalog {
  return Object.fromEntries(
    Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function areCatalogsEqual(
  a: WorkspaceCatalog,
  b: WorkspaceCatalog,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePackagePatterns(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((pattern) => pattern.length > 0);
}

function normalizeCatalog(value: unknown): WorkspaceCatalog {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: WorkspaceCatalog = {};

  for (const [key, rawValue] of Object.entries(value)) {
    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      normalized[key] = rawValue.trim();
    }
  }

  return normalized;
}

function createWorkspaceSnapshot(
  config: PnpmWorkspaceConfig,
): WorkspaceFileSnapshot {
  const catalogsRecord = isRecord(config.catalogs)
    ? (config.catalogs as Record<string, unknown>)
    : {};

  return {
    config,
    packages: normalizePackagePatterns(config.packages),
    catalog: normalizeCatalog(catalogsRecord.default),
  };
}

async function writeWorkspaceSnapshot(
  snapshot: WorkspaceFileSnapshot,
  updates: Partial<Pick<WorkspaceFileSnapshot, "packages" | "catalog">>,
) {
  const nextPackages = [...(updates.packages ?? snapshot.packages)];
  const nextCatalog = { ...(updates.catalog ?? snapshot.catalog) };

  const baseConfig = snapshot.config;
  const { packages: _packages, catalogs: rawCatalogs, ...rest } = baseConfig;
  const catalogsRecord = isRecord(rawCatalogs)
    ? (rawCatalogs as Record<string, unknown>)
    : {};

  const nextConfig: PnpmWorkspaceConfig = {
    packages: nextPackages,
    ...rest,
    catalogs: {
      ...catalogsRecord,
      default: nextCatalog,
    },
  };

  const serialized = ensureTrailingNewline(
    stringifyAsYaml(nextConfig),
  );

  await writeFile(pnpmWorkspacePath, serialized, "utf8");

  workspaceSnapshotCache = {
    config: nextConfig,
    packages: nextPackages,
    catalog: nextCatalog,
  };
}

function stringifyAsYaml(config: PnpmWorkspaceConfig): string {
  return stringifyYaml(config, { indent: 2, lineWidth: 0 });
}

async function readWorkspaceSnapshot(): Promise<WorkspaceFileSnapshot | null> {
  if (typeof workspaceSnapshotCache !== "undefined") {
    return workspaceSnapshotCache;
  }

  try {
    const workspaceContent = await readFile(pnpmWorkspacePath, "utf8");
    const parsed = parseYaml(workspaceContent) ?? {};

    if (!isRecord(parsed)) {
      log.error(
        `Invalid ${pnpmWorkspacePath} format. Expected an object at the root.`,
      );
      workspaceSnapshotCache = null;
      return null;
    }

    const snapshot = createWorkspaceSnapshot(parsed);
    workspaceSnapshotCache = snapshot;
    return snapshot;
  } catch (error) {
    log.error(
      `Failed to read workspace configuration from ${pnpmWorkspacePath}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    workspaceSnapshotCache = null;
    return null;
  }
}

async function readWorkspacePackagePatterns(): Promise<string[]> {
  const snapshot = await readWorkspaceSnapshot();
  return snapshot?.packages ?? [];
}

async function readWorkspaceCatalog(): Promise<WorkspaceCatalog> {
  const snapshot = await readWorkspaceSnapshot();
  return snapshot?.catalog ?? {};
}

function sortObjectByKeys<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  ) as T;
}

const rootDir = process.cwd();

type DependencyGroup = "dependencies" | "devDependencies";

interface WorkspacePackage {
  name: string;
  dir: string;
  packageJsonPath: string;
}

interface CommandOptions {
  cwd?: string;
}

function runCommand(
  command: string,
  args: string[],
  { cwd }: CommandOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            stderr.trim() ||
              `Command "${command} ${args.join(" ")}" exited with code ${String(code)}`,
          ),
        );
      }
    });
  });
}

function runInteractiveCommand(
  command: string,
  args: string[],
  { cwd }: CommandOptions = {},
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Command "${command} ${args.join(" ")}" exited with code ${String(code)}`,
          ),
        );
      }
    });
  });
}

async function fetchLatestVersion(pkg: string): Promise<string> {
  try {
    const stdout = await runCommand("npm", ["view", pkg, "version", "--json"]);
    return JSON.parse(stdout) as string;
  } catch (error) {
    throw new Error(
      `Failed to resolve latest version for ${pkg}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

/**
 * Extract package name from a dependency specifier.
 * Handles both scoped (@scope/pkg@1.0.0) and unscoped (pkg@1.0.0) packages.
 *
 * @example
 * getDependencyName("@scope/pkg@1.0.0") // "@scope/pkg"
 * getDependencyName("react@18.0.0") // "react"
 * getDependencyName("@babel/core") // "@babel/core"
 * getDependencyName("lodash") // "lodash"
 */
function getDependencyName(specifier: string): string {
  // Handle scoped packages (@scope/pkg)
  if (specifier.startsWith("@")) {
    return extractScopedPackageName(specifier);
  }

  // Handle unscoped packages
  return extractUnscopedPackageName(specifier);
}

/**
 * Extract name from scoped package specifier.
 * Scoped packages have format: @scope/name or @scope/name@version
 */
function extractScopedPackageName(specifier: string): string {
  const slashIndex = specifier.indexOf("/");
  if (slashIndex === -1) {
    return specifier;
  }

  const versionSeparator = specifier.indexOf("@", slashIndex);
  return versionSeparator === -1
    ? specifier
    : specifier.slice(0, versionSeparator);
}

/**
 * Extract name from unscoped package specifier.
 * Unscoped packages have format: name or name@version
 */
function extractUnscopedPackageName(specifier: string): string {
  const versionSeparator = specifier.indexOf("@");
  return versionSeparator === -1
    ? specifier
    : specifier.slice(0, versionSeparator);
}

/**
 * Derive version specifier preserving the original version prefix.
 * Maintains semantic versioning operators (^, ~, >=, etc) from the current spec.
 *
 * @example
 * deriveSpec("^1.0.0", "2.0.0") // "^2.0.0"
 * deriveSpec("~1.0.0", "2.0.0") // "~2.0.0"
 * deriveSpec(undefined, "2.0.0") // "^2.0.0" (default)
 */
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

/**
 * Retrieve all workspace packages defined in the monorepo.
 * Resolves workspace patterns from root package.json and reads each package manifest.
 *
 * @returns Array of workspace packages with name, directory, and manifest path
 */

async function getWorkspacePackages(): Promise<WorkspacePackage[]> {
  const workspacePatterns = await readWorkspacePackagePatterns();

  if (workspacePatterns.length === 0) {
    log.error(
      `No workspace package patterns defined in ${pnpmWorkspacePath}.`,
    );
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

  const nextRecord = sortObjectByKeys(currentRecord);

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
  const workspaceSnapshot = await readWorkspaceSnapshot();
  if (!workspaceSnapshot) {
    log.error(
      `Unable to update ${pnpmWorkspacePath} because it is missing or invalid.`,
    );
    process.exit(1);
  }

  const catalog: WorkspaceCatalog = { ...workspaceSnapshot.catalog };
  let updated = false;

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

  const sortedCatalog = sortWorkspaceCatalog(catalog);

  const catalogChanged = !areCatalogsEqual(
    sortedCatalog,
    workspaceSnapshot.catalog,
  );

  if (!updated && !catalogChanged) {
    log.info("No workspaces.catalog changes required.");
    return false;
  }

  await writeWorkspaceSnapshot(workspaceSnapshot, { catalog: sortedCatalog });
  log.success(`Updated default catalog in ${pnpmWorkspacePath}.`);
  return true;
}

async function runPnpmInstall() {
  await runInteractiveCommand("pnpm", ["install"]);
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
      await runPnpmInstall();
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
