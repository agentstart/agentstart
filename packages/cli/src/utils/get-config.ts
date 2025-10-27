/* agent-frontmatter:start
AGENT: Agent Start CLI config loader
PURPOSE: Resolve agent configuration files and normalize runtime options
USAGE: await getConfig({ cwd, configPath })
EXPORTS: getConfig
FEATURES:
  - Searches common paths and respects project aliases
  - Loads TypeScript/JS configs via c12 with Babel presets
  - Adds SvelteKit env module support automatically
SEARCHABLE: cli config, config loader, agent resolver
agent-frontmatter:end */

import path from "node:path";
import { logger } from "@agentstart/utils";
// @ts-expect-error
import babelPresetReact from "@babel/preset-react";
// @ts-expect-error
import babelPresetTypescript from "@babel/preset-typescript";
import type { AgentStart, AgentStartOptions } from "agentstart";
import { loadConfig } from "c12";
import fs from "fs-extra";
import { addSvelteKitEnvModules } from "./add-svelte-kit-env-modules";
import { getTsconfigInfo } from "./get-tsconfig-info";

// Type alias for config loading
type AgentConfig =
  | {
      start?: AgentStart;
    }
  | AgentStart;

// Error messages
const ERROR_MESSAGES = {
  INVALID_EXPORT:
    'Make sure to default export your agent instance or to export as a variable named "start".',
  SERVER_ONLY:
    "Please remove import 'server-only' from your agent config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.",
} as const;

// Build possible config file paths
const baseFileNames = [
  "agent.ts",
  "agent.tsx",
  "agent.js",
  "agent.jsx",
  "agent.server.js",
  "agent.server.ts",
];

const subDirectories = ["lib/server", "server", "lib", "utils"];
const rootDirectories = ["src", "app"];

let possiblePaths = [
  ...baseFileNames,
  ...baseFileNames.flatMap((file) =>
    subDirectories.map((dir) => `${dir}/${file}`),
  ),
];

possiblePaths = [
  ...possiblePaths,
  ...possiblePaths.flatMap((file) =>
    rootDirectories.map((dir) => `${dir}/${file}`),
  ),
];

function getPathAliases(cwd: string): Record<string, string> | null {
  const tsConfigPath = path.join(cwd, "tsconfig.json");
  if (!fs.existsSync(tsConfigPath)) {
    return null;
  }
  try {
    const tsConfig = getTsconfigInfo(cwd);
    const { paths = {}, baseUrl = "." } = tsConfig.compilerOptions || {};
    const result: Record<string, string> = {};
    const obj = Object.entries(paths) as [string, string[]][];
    for (const [alias, aliasPaths] of obj) {
      for (const aliasedPath of aliasPaths) {
        const resolvedBaseUrl = path.join(cwd, baseUrl);
        const finalAlias = alias.slice(-1) === "*" ? alias.slice(0, -1) : alias;
        const finalAliasedPath =
          aliasedPath.slice(-1) === "*"
            ? aliasedPath.slice(0, -1)
            : aliasedPath;

        result[finalAlias || ""] = path.join(resolvedBaseUrl, finalAliasedPath);
      }
    }
    addSvelteKitEnvModules(result);
    return result;
  } catch (error) {
    console.error(error);
    throw new Error("Error parsing tsconfig.json");
  }
}
/**
 * .tsx files are not supported by Jiti.
 */
const jitiOptions = (cwd: string) => {
  const alias = getPathAliases(cwd) || {};
  return {
    transformOptions: {
      babel: {
        presets: [
          [
            babelPresetTypescript,
            {
              isTSX: true,
              allExtensions: true,
            },
          ],
          [babelPresetReact, { runtime: "automatic" }],
        ],
      },
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias,
  };
};

/**
 * Extract AgentStartOptions from c12 config
 * Handles both named export (export const start) and default export (export default)
 */
function extractAgentStartOptions(config: unknown): AgentStartOptions | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  // Check if it's a named export: { start: AgentStart }
  const configAsObject = config as { start?: AgentStart };
  if (configAsObject.start?.options) {
    return configAsObject.start.options;
  }

  // Check if it's a default export: AgentStart directly
  if ("options" in config) {
    const configAsAgentStart = config as AgentStart;
    return configAsAgentStart.options;
  }

  return null;
}

/**
 * Check if error is caused by 'server-only' import
 */
function isServerOnlyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes(
      "This module cannot be imported from a Client Component module",
    )
  );
}

/**
 * Handle config loading errors
 */
function handleConfigError(
  error: unknown,
  context: string,
  shouldThrow: boolean,
): never {
  if (isServerOnlyError(error)) {
    const message = ERROR_MESSAGES.SERVER_ONLY;
    if (shouldThrow) {
      throw new Error(message);
    }
    logger.error(message);
    process.exit(1);
  }

  if (shouldThrow) {
    throw error;
  }

  logger.error(
    `Couldn't read your agent config${context ? ` ${context}` : ""}.`,
    error,
  );
  process.exit(1);
}
export async function getConfig({
  cwd,
  configPath,
  shouldThrowOnError = false,
}: {
  cwd: string;
  configPath?: string;
  shouldThrowOnError?: boolean;
}) {
  try {
    let agentStartOptions: AgentStartOptions | null = null;

    // Try to load config from specified path
    if (configPath) {
      let resolvedPath: string = path.join(cwd, configPath);
      if (fs.existsSync(configPath)) resolvedPath = configPath;

      const { config } = await loadConfig<AgentConfig>({
        configFile: resolvedPath,
        dotenv: true,
        jitiOptions: jitiOptions(cwd),
      });

      agentStartOptions = extractAgentStartOptions(config);

      if (!agentStartOptions) {
        const message = `Couldn't read your agent config in ${resolvedPath}. ${ERROR_MESSAGES.INVALID_EXPORT}`;
        if (shouldThrowOnError) {
          throw new Error(message);
        }
        logger.error(`[#agentstart]: ${message}`);
        process.exit(1);
      }
    }

    // Try to find config in possible paths
    if (!agentStartOptions) {
      for (const possiblePath of possiblePaths) {
        try {
          const { config } = await loadConfig<AgentConfig>({
            configFile: possiblePath,
            jitiOptions: jitiOptions(cwd),
          });

          const hasConfig = Object.keys(config).length > 0;
          if (hasConfig) {
            agentStartOptions = extractAgentStartOptions(config);

            if (!agentStartOptions) {
              const message = `Couldn't read your agent config. ${ERROR_MESSAGES.INVALID_EXPORT}`;
              if (shouldThrowOnError) {
                throw new Error(message);
              }
              logger.error(`[#agentstart]: ${message.split(".")[0]}.`);
              console.log("");
              logger.info(`[#agentstart]: ${ERROR_MESSAGES.INVALID_EXPORT}`);
              process.exit(1);
            }
            break;
          }
        } catch (e) {
          handleConfigError(e, "", shouldThrowOnError);
        }
      }
    }

    return agentStartOptions;
  } catch (e) {
    handleConfigError(e, "", shouldThrowOnError);
  }
}

export { possiblePaths };
