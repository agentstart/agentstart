/* agent-frontmatter:start
  AGENT: Config path finder utility
  PURPOSE: Intelligently locate configuration files with priority-based search
  USAGE: import { findConfigPath } from '../utils/find-config-path'
  EXPORTS: findConfigPath
  FEATURES:
    - Priority-based path search
    - Automatic src/ and app/ prefix addition
    - Scoped path support for highest priority
    - File existence checking
  SEARCHABLE: config path, file finder, priority search
  agent-frontmatter:end */

import path from "node:path";
import fs from "fs-extra";

/**
 * Find a configuration file by searching through prioritized paths
 */
export function findConfigPath({
  cwd,
  filenames,
  directories,
  scopedPaths = [],
  getPriority,
}: {
  cwd: string;
  filenames: string[];
  directories: string[];
  scopedPaths?: string[];
  getPriority: (candidate: string) => number;
}): string {
  const basePaths = [
    ...filenames,
    ...directories.flatMap((directory) =>
      filenames.map((file) => `${directory}/${file}`),
    ),
  ];

  const possiblePaths = Array.from(
    new Set([
      ...scopedPaths,
      ...basePaths,
      ...basePaths.map((candidate) => `src/${candidate}`),
      ...basePaths.map((candidate) => `app/${candidate}`),
    ]),
  );

  const prioritizedPaths = possiblePaths
    .map((pathOption, index) => ({ pathOption, index }))
    .sort((a, b) => {
      const priorityDifference =
        getPriority(a.pathOption) - getPriority(b.pathOption);
      if (priorityDifference !== 0) return priorityDifference;
      return a.index - b.index;
    })
    .map(({ pathOption }) => pathOption);

  for (const possiblePath of prioritizedPaths) {
    const fullPath = path.join(cwd, possiblePath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return "";
}
