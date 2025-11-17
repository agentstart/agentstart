/* agent-frontmatter:start
AGENT: Component sync watcher
PURPOSE: Mirror UI and agent registry edits into app packages during development
USAGE: pnpm --filter @agentstart/components dev
EXPORTS: (script)
FEATURES:
  - Watches UI and agent registry sources for changes
  - Copies updates into every app package without touching unrelated files
  - Handles file additions, updates, and deletions
SEARCHABLE: component sync, watch script, app mirroring
agent-frontmatter:end */

import { copyFile, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import chokidar, { type FSWatcher } from "chokidar";

type CategoryKey = "ui" | "agent";

interface CategoryConfig {
  sourceRoot: string;
  targetSubDir: string;
}

const componentsRoot = process.cwd();
const workspaceRoot = path.resolve(componentsRoot, "..", "..");
const appsRoot = path.join(workspaceRoot, "apps");
const syncSkipMarker = "// agentstart-sync:ignore";

const categories: Record<CategoryKey, CategoryConfig> = {
  ui: {
    sourceRoot: path.join(componentsRoot, "src/components/ui"),
    targetSubDir: path.join("src", "components", "ui"),
  },
  agent: {
    sourceRoot: path.join(componentsRoot, "src/registry/agentstart"),
    targetSubDir: path.join("src", "components", "agent"),
  },
};

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

const normalizeAbsolute = (filePath: string) => path.resolve(filePath);

const safeStat = async (filePath: string) => {
  try {
    return await stat(filePath);
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
};

const ensureSourceDirectory = async (directory: string) => {
  const stats = await safeStat(directory);
  if (stats === null || !stats.isDirectory()) {
    throw new Error(`Source directory is missing: ${directory}`);
  }
};

const shouldSkipTarget = async (targetPath: string) => {
  const targetStat = await safeStat(targetPath);
  if (!targetStat?.isFile()) {
    return false;
  }

  const content = await readFile(targetPath, "utf8");
  const header = content.slice(0, 1024);
  return header.includes(syncSkipMarker);
};

const discoverAppPackages = async (): Promise<string[]> => {
  const entries = await readdir(appsRoot, { withFileTypes: true });
  const appPaths: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const appRoot = path.join(appsRoot, entry.name);
    const manifestPath = path.join(appRoot, "package.json");
    const manifestStat = await safeStat(manifestPath);

    if (manifestStat?.isFile()) {
      appPaths.push(normalizeAbsolute(appRoot));
    }
  }

  return appPaths;
};

async function* walkFiles(directory: string): AsyncGenerator<string> {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walkFiles(entryPath);
    } else if (entry.isFile()) {
      yield normalizeAbsolute(entryPath);
    }
  }
}

interface SyncOptions {
  sourcePath: string;
  categoryKey: CategoryKey;
  appPackages: string[];
}

const syncFileToApps = async ({
  sourcePath,
  categoryKey,
  appPackages,
}: SyncOptions) => {
  const category = categories[categoryKey];
  const relativePath = path.relative(category.sourceRoot, sourcePath);

  if (relativePath.startsWith("..")) {
    return;
  }

  for (const appRoot of appPackages) {
    const targetPath = path.join(appRoot, category.targetSubDir, relativePath);
    if (await shouldSkipTarget(targetPath)) {
      const logPath = path.relative(workspaceRoot, targetPath);
      console.log(
        `[sync:${categoryKey}] skipped ${logPath} (sync ignore marker found)`,
      );
      continue;
    }
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);

    const logPath = path.relative(workspaceRoot, targetPath);
    console.log(`[sync:${categoryKey}] updated ${logPath}`);
  }
};

const removeFromApps = async ({
  sourcePath,
  categoryKey,
  appPackages,
}: SyncOptions) => {
  const category = categories[categoryKey];
  const relativePath = path.relative(category.sourceRoot, sourcePath);

  if (relativePath.startsWith("..")) {
    return;
  }

  for (const appRoot of appPackages) {
    const targetPath = path.join(appRoot, category.targetSubDir, relativePath);
    if (await shouldSkipTarget(targetPath)) {
      const logPath = path.relative(workspaceRoot, targetPath);
      console.log(
        `[sync:${categoryKey}] preserved ${logPath} (sync ignore marker found)`,
      );
      continue;
    }
    await rm(targetPath, { force: true });

    const logPath = path.relative(workspaceRoot, targetPath);
    console.log(`[sync:${categoryKey}] removed ${logPath}`);
  }
};

const initialSync = async (categoryKey: CategoryKey, appPackages: string[]) => {
  for await (const filePath of walkFiles(categories[categoryKey].sourceRoot)) {
    await syncFileToApps({ sourcePath: filePath, categoryKey, appPackages });
  }
};

const startWatcher = (
  categoryKey: CategoryKey,
  appPackages: string[],
): FSWatcher => {
  const watcher = chokidar.watch(categories[categoryKey].sourceRoot, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("add", (filePath) =>
    syncFileToApps({
      sourcePath: normalizeAbsolute(filePath),
      categoryKey,
      appPackages,
    }),
  );
  watcher.on("change", (filePath) =>
    syncFileToApps({
      sourcePath: normalizeAbsolute(filePath),
      categoryKey,
      appPackages,
    }),
  );
  watcher.on("unlink", (filePath) =>
    removeFromApps({
      sourcePath: normalizeAbsolute(filePath),
      categoryKey,
      appPackages,
    }),
  );
  watcher.on("error", (error) => {
    console.error(`[sync:${categoryKey}] watcher error`, error);
  });

  return watcher;
};

const main = async () => {
  const appPackages = await discoverAppPackages();

  if (appPackages.length === 0) {
    console.warn("[sync] No app packages found under /apps; nothing to watch.");
    return;
  }

  await Promise.all([
    ensureSourceDirectory(categories.ui.sourceRoot),
    ensureSourceDirectory(categories.agent.sourceRoot),
  ]);

  console.log(
    `[sync] Found ${appPackages.length} app package(s): ${appPackages
      .map((appPath) => path.basename(appPath))
      .join(", ")}`,
  );

  await initialSync("ui", appPackages);
  await initialSync("agent", appPackages);

  const watchers = [
    startWatcher("ui", appPackages),
    startWatcher("agent", appPackages),
  ];

  console.log("[sync] Watching for changes...");

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`[sync] Caught ${signal}, shutting down watchers...`);
      await Promise.all(watchers.map((watcher) => watcher.close()));
      process.exit(0);
    });
  });
};

void main();
