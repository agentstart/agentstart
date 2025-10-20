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

let possiblePaths = [
  "agent.ts",
  "agent.tsx",
  "agent.js",
  "agent.jsx",
  "agent.server.js",
  "agent.server.ts",
];

possiblePaths = [
  ...possiblePaths,
  ...possiblePaths.map((it) => `lib/server/${it}`),
  ...possiblePaths.map((it) => `server/${it}`),
  ...possiblePaths.map((it) => `lib/${it}`),
  ...possiblePaths.map((it) => `utils/${it}`),
];
possiblePaths = [
  ...possiblePaths,
  ...possiblePaths.map((it) => `src/${it}`),
  ...possiblePaths.map((it) => `app/${it}`),
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
    let configFile: AgentStartOptions | null = null;
    if (configPath) {
      let resolvedPath: string = path.join(cwd, configPath);
      if (fs.existsSync(configPath)) resolvedPath = configPath; // If the configPath is a file, use it as is, as it means the path wasn't relative.
      const { config } = await loadConfig<{
        agentStart?: AgentStartOptions;
        default?: AgentStartOptions;
      }>({
        configFile: resolvedPath,
        dotenv: true,
        jitiOptions: jitiOptions(cwd),
      });
      if (!config.agentStart && !config.default) {
        if (shouldThrowOnError) {
          throw new Error(
            `Couldn't read your agent config in ${resolvedPath}. Make sure to default export your agent instance or to export as a variable named agent.`,
          );
        }
        logger.error(
          `[#agentstart]: Couldn't read your agent config in ${resolvedPath}. Make sure to default export your agent instance or to export as a variable named agent.`,
        );
        process.exit(1);
      }
      configFile = config.agentStart || config.default || null;
    }

    if (!configFile) {
      for (const possiblePath of possiblePaths) {
        try {
          const { config } = await loadConfig<{
            start?: AgentStart;
          }>({
            configFile: possiblePath,
            jitiOptions: jitiOptions(cwd),
          });
          const hasConfig = Object.keys(config).length > 0;
          if (hasConfig) {
            configFile = config.start?.options || null;
            if (!configFile) {
              if (shouldThrowOnError) {
                throw new Error(
                  "Couldn't read your agent config. Make sure to default export your agent instance or to export as a variable named agent.",
                );
              }
              logger.error("[#agentstart]: Couldn't read your agent config.");
              console.log("");
              logger.info(
                "[#agentstart]: Make sure to default export your agent instance or to export as a variable named agent.",
              );
              process.exit(1);
            }
            break;
          }
        } catch (e) {
          if (
            typeof e === "object" &&
            e &&
            "message" in e &&
            typeof e.message === "string" &&
            e.message.includes(
              "This module cannot be imported from a Client Component module",
            )
          ) {
            if (shouldThrowOnError) {
              throw new Error(
                `Please remove import 'server-only' from your agent config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`,
              );
            }
            logger.error(
              `Please remove import 'server-only' from your agent config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`,
            );
            process.exit(1);
          }
          if (shouldThrowOnError) {
            throw e;
          }
          logger.error("[#agentstart]: Couldn't read your agent config.", e);
          process.exit(1);
        }
      }
    }
    return configFile;
  } catch (e) {
    if (
      typeof e === "object" &&
      e &&
      "message" in e &&
      typeof e.message === "string" &&
      e.message.includes(
        "This module cannot be imported from a Client Component module",
      )
    ) {
      if (shouldThrowOnError) {
        throw new Error(
          `Please remove import 'server-only' from your agent config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`,
        );
      }
      logger.error(
        `Please remove import 'server-only' from your agent config file temporarily. The CLI cannot resolve the configuration with it included. You can re-add it after running the CLI.`,
      );
      process.exit(1);
    }
    if (shouldThrowOnError) {
      throw e;
    }

    logger.error("Couldn't read your agent config.", e);
    process.exit(1);
  }
}

export { possiblePaths };
