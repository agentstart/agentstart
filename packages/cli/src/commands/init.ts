/* agent-frontmatter:start
AGENT: Agent Stack CLI init command
PURPOSE: Bootstrap agent configuration, env files, and optional database wiring
USAGE: await initAction(commandOptions)
EXPORTS: init, initAction
FEATURES:
  - Guides users through Agent Stack setup with interactive prompts
  - Writes server/client config files and installs supporting deps
  - Updates environment variables while keeping plugin logic minimal
SEARCHABLE: cli init, agent stack setup, bootstrap workflow
agent-frontmatter:end */

import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import chalk from "chalk";
import { Command } from "commander";
import { parse } from "dotenv";
import fs from "fs-extra";
import { format as prettierFormat } from "prettier";
import semver from "semver";
import { z } from "zod";
import { generateConfig } from "../generators/agent-config";
import { checkPackageManagers } from "../utils/check-package-managers";
import { formatMilliseconds } from "../utils/format-ms";
import { getPackageInfo } from "../utils/get-package-info";
import { getTsconfigInfo } from "../utils/get-tsconfig-info";
import { installDependencies } from "../utils/install-dependencies";

/**
 * Find a configuration file by searching through prioritized paths
 */
function findConfigPath({
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

/**
 * Should only use any database that is core DBs, and supports the Agent Stack CLI generate functionality.
 */
const supportedDatabases = [
  // Built-in kysely
  "sqlite",
  "mysql",
  "mssql",
  "postgres",
  // Drizzle
  "drizzle:pg",
  "drizzle:mysql",
  "drizzle:sqlite",
  // Prisma
  "prisma:postgresql",
  "prisma:mysql",
  "prisma:sqlite",
  // Mongo
  "mongodb",
] as const;

export type SupportedDatabases = (typeof supportedDatabases)[number];

const defaultFormatOptions = {
  trailingComma: "all" as const,
  useTabs: false,
  tabWidth: 4,
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

type ParsedTsConfig = {
  compilerOptions?: {
    strict?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const getDefaultAgentConfig = async ({ appName }: { appName?: string }) =>
  await prettierFormat(
    [
      `import { createOpenRouter } from "@openrouter/ai-sdk-provider";
       import { Agent, defineAgentConfig } from "agent-stack";`,
      `if (!process.env.MODEL_PROVIDER_API_KEY) {
         throw new Error("Missing MODEL_PROVIDER_API_KEY");
       }
       const openrouter = createOpenRouter({
         apiKey: process.env.MODEL_PROVIDER_API_KEY,
       });`,
      `const agent = new Agent({
         model: openrouter("x-ai/grok-4-fast"),
         instructions: "You are a helpful assistant.",
       });`,
      `export const agentStack = defineAgentConfig({
         ${appName ? `appName: "${appName}",` : ""}
         agent,
       });`,
    ].join("\n"),
    {
      filepath: "agent.ts",
      ...defaultFormatOptions,
    },
  );

// type SupportedFrameworks =
//   | "vanilla"
//   | "react"
//   | "vue"
//   | "svelte"
//   | "solid"
//   | "nextjs";

/**
 * Compose the base agent client config wired to the generated server config.
 */
const getDefaultAgentClientConfig = async (
  //   {
  //   framework,
  // }: {
  //   framework: SupportedFrameworks;
  // }
) => {
  return await prettierFormat(
    [
      `import { createAgentClient, useChatStore } from "agent-stack/client";`,
      `export const { client, useChat } = createAgentClient();`,
      "",
      `export { useChatStore };`,
    ].join("\n"),
    {
      filepath: "agent-client.ts",
      ...defaultFormatOptions,
    },
  );
};

const optionsSchema = z.object({
  cwd: z.string(),
  config: z.string().optional(),
  database: z.enum(supportedDatabases).optional(),
  "skip-db": z.boolean().optional(),
  "package-manager": z.string().optional(),
});

const outroText = `✅ Setup complete!`;

export async function initAction(opts: z.infer<typeof optionsSchema>) {
  console.log();
  intro("Agent Stack Setup");

  const options = optionsSchema.parse(opts);

  const cwd = path.resolve(options.cwd);
  let packageManagerPreference: "bun" | "pnpm" | "yarn" | "npm" | undefined;

  let configPath: string = "";
  // const framework: SupportedFrameworks = "vanilla";

  const format = async (code: string) =>
    await prettierFormat(code, {
      filepath: configPath,
      ...defaultFormatOptions,
    });

  // ===== package.json =====
  let packageInfo: PackageJson;
  try {
    packageInfo = getPackageInfo(cwd);
  } catch (error) {
    log.error(`❌ Couldn't read your package.json file. (dir: ${cwd})`);
    log.error(JSON.stringify(error, null, 2));
    process.exit(1);
  }

  // ===== ENV files =====
  const envFiles = await getEnvFiles(cwd);
  if (!envFiles.length) {
    outro("❌ No .env files found. Create one first.");
    process.exit(0);
  }
  let targetEnvFile: string;
  if (envFiles.includes(".env")) targetEnvFile = ".env";
  else if (envFiles.includes(".env.local")) targetEnvFile = ".env.local";
  else if (envFiles.includes(".env.development"))
    targetEnvFile = ".env.development";
  else if (envFiles.length === 1) targetEnvFile = envFiles[0]!;
  else targetEnvFile = "none";

  // ===== tsconfig.json =====
  let tsconfigInfo: ParsedTsConfig;
  try {
    tsconfigInfo = await getTsconfigInfo(cwd);
  } catch (error) {
    log.error(`❌ Couldn't read your tsconfig.json file. (dir: ${cwd})`);
    console.error(error);
    process.exit(1);
  }
  if (tsconfigInfo.compilerOptions?.strict !== true) {
    log.warn(
      `Agent Stack requires your tsconfig.json to have ${chalk.bold("compilerOptions.strict")} set to true.`,
    );
    const enableStrict = await confirm({
      message: `Enable ${chalk.bold("strict")} mode?`,
    });
    if (isCancel(enableStrict)) {
      cancel(`Operation cancelled`);
      process.exit(0);
    }
    if (enableStrict) {
      try {
        await fs.writeFile(
          path.join(cwd, "tsconfig.json"),
          await prettierFormat(
            JSON.stringify(
              Object.assign(tsconfigInfo, {
                compilerOptions: {
                  strict: true,
                },
              }),
            ),
            { filepath: "tsconfig.json", ...defaultFormatOptions },
          ),
          "utf-8",
        );
        log.success(`✅ tsconfig.json updated`);
      } catch (error) {
        log.error(`Failed to update tsconfig.json`);
        console.error(error);
        process.exit(1);
      }
    }
  }

  // ===== install agent-stack =====
  const s = spinner({ indicator: "dots" });

  if (process.env.NODE_ENV !== "development") {
    s.start(`Checking agent-stack version`);
    let latestAgentStackVersion: string;
    try {
      latestAgentStackVersion = await getLatestNpmVersion("agent-stack");
    } catch (error) {
      log.error(`❌ Failed to fetch latest version`);
      console.error(error);
      process.exit(1);
    }

    if (
      !packageInfo.dependencies ||
      !Object.keys(packageInfo.dependencies).includes("agent-stack")
    ) {
      s.stop("Finished version check");
      const s2 = spinner({ indicator: "dots" });
      const installDep = await confirm({
        message: `Install agent-stack?`,
      });
      if (isCancel(installDep)) {
        cancel(`Operation cancelled`);
        process.exit(0);
      }
      if (packageManagerPreference === undefined) {
        packageManagerPreference = await getPackageManager();
      }
      if (installDep) {
        s2.start(
          `Installing agent-stack with ${chalk.bold(packageManagerPreference)}`,
        );
        try {
          const start = Date.now();
          await installDependencies({
            dependencies: ["agent-stack@latest"],
            packageManager: packageManagerPreference,
            cwd: cwd,
          });
          s2.stop(
            `✅ agent-stack installed ${chalk.gray(`(${formatMilliseconds(Date.now() - start)})`)}`,
          );
        } catch (error: unknown) {
          s2.stop(`❌ Installation failed`);
          console.error(getErrorMessage(error));
          process.exit(1);
        }
      }
    } else if (
      packageInfo.dependencies["agent-stack"] !== "workspace:*" &&
      semver.lt(
        semver.coerce(packageInfo.dependencies["agent-stack"])?.toString()!,
        semver.clean(latestAgentStackVersion)!,
      )
    ) {
      s.stop("Finished version check");
      const updateDep = await confirm({
        message: `Update agent-stack? (${chalk.bold(
          packageInfo.dependencies["agent-stack"],
        )} → ${chalk.bold(`v${latestAgentStackVersion}`)})`,
      });
      if (isCancel(updateDep)) {
        cancel(`Operation cancelled`);
        process.exit(0);
      }
      if (updateDep) {
        if (packageManagerPreference === undefined) {
          packageManagerPreference = await getPackageManager();
        }
        const s = spinner({ indicator: "dots" });
        s.start(
          `Updating agent-stack with ${chalk.bold(packageManagerPreference)}`,
        );
        try {
          const start = Date.now();
          await installDependencies({
            dependencies: ["agent-stack@latest"],
            packageManager: packageManagerPreference,
            cwd: cwd,
          });
          s.stop(
            `✅ agent-stack updated ${chalk.gray(`(${formatMilliseconds(Date.now() - start)})`)}`,
          );
        } catch (error: unknown) {
          s.stop(`❌ Update failed`);
          log.error(getErrorMessage(error));
          process.exit(1);
        }
      }
    } else {
      s.stop(`✅ agent-stack is up-to-date`);
    }
  }

  // ===== appName =====

  const packageJson = getPackageInfo(cwd);
  let appName: string;
  if (!packageJson.name) {
    const newAppName = await text({
      message: "Application name:",
    });
    if (isCancel(newAppName)) {
      cancel("Operation cancelled");
      process.exit(0);
    }
    appName = newAppName;
  } else {
    appName = packageJson.name;
  }

  // ===== config path =====

  if (options.config) {
    configPath = path.join(cwd, options.config);
  } else {
    configPath = findConfigPath({
      cwd,
      filenames: ["agent.ts", "agent.tsx", "agent.js", "agent.jsx"],
      directories: ["lib/server", "server", "lib", "utils"],
      getPriority: (candidate: string) => {
        if (candidate.startsWith("src/lib/")) return 0;
        if (candidate.startsWith("app/lib/")) return 1;
        if (candidate.startsWith("src/")) return 2;
        if (candidate.startsWith("app/")) return 3;
        if (!candidate.includes("/")) return 5;
        return 4;
      },
    });
  }

  // ===== create agent config =====
  let current_user_config = "";
  let database: SupportedDatabases | null = null;

  if (!configPath) {
    const createConfig = await select({
      message: `Create agent config?`,
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    if (isCancel(createConfig)) {
      cancel(`Operation cancelled`);
      process.exit(0);
    }
    if (createConfig === "yes") {
      const setupDb = await confirm({
        message: `Set up ${chalk.bold("database")}?`,
        initialValue: true,
      });
      if (isCancel(setupDb)) {
        cancel(`Operation cancelled`);
        process.exit(0);
      }
      if (setupDb) {
        const prompted_database = await select({
          message: "Database dialect:",
          options: supportedDatabases.map((it) => ({ value: it, label: it })),
        });
        if (isCancel(prompted_database)) {
          cancel(`Operation cancelled`);
          process.exit(0);
        }
        database = prompted_database;
      }

      const preferredCreationDirectories = [
        {
          base: path.join(cwd, "src"),
          target: path.join(cwd, "src", "lib"),
        },
        {
          base: path.join(cwd, "app"),
          target: path.join(cwd, "app", "lib"),
        },
      ];
      let targetConfigDirectory = cwd;

      for (const candidate of preferredCreationDirectories) {
        if (await fs.pathExists(candidate.base)) {
          targetConfigDirectory = candidate.target;
          break;
        }
      }
      if (targetConfigDirectory !== cwd) {
        await fs.ensureDir(targetConfigDirectory);
      }

      const filePath = path.join(targetConfigDirectory, "agent.ts");
      configPath = filePath;
      log.info(`Creating: ${filePath}`);
      try {
        current_user_config = await getDefaultAgentConfig({
          appName,
        });
        const { dependencies, envs, generatedCode } = await generateConfig({
          current_user_config,
          format,
          spinner: s,
          database,
        });
        current_user_config = generatedCode;
        await fs.writeFile(filePath, current_user_config);
        configPath = filePath;
        log.success(`✅ Agent config created`);

        if (envs.length !== 0) {
          log.info(`Found ${envs.length} environment variables for database`);
          const updateEnvFiles = await confirm({
            message: `Update .env files?`,
          });
          if (isCancel(updateEnvFiles)) {
            cancel("Operation cancelled");
            process.exit(0);
          }
          if (updateEnvFiles) {
            const filesToUpdate = await multiselect({
              message: "Select .env files to update:",
              options: envFiles.map((x) => ({
                value: path.join(cwd, x),
                label: x,
              })),
              required: false,
            });
            if (isCancel(filesToUpdate)) {
              cancel("Operation cancelled");
              process.exit(0);
            }
            if (filesToUpdate.length === 0) {
              log.info("Skipping .env updates");
            } else {
              try {
                await updateEnvs({
                  files: filesToUpdate,
                  envs,
                  isCommented: true,
                });
              } catch (error) {
                log.error(`Failed to update .env files`);
                log.error(JSON.stringify(error, null, 2));
                process.exit(1);
              }
              log.success(`✅ ENV files updated`);
            }
          }
        }
        if (dependencies.length !== 0) {
          log.info(
            `Dependencies needed: ${dependencies
              .map((x) => chalk.green(x))
              .join(", ")}`,
          );
          const installDeps = await confirm({
            message: `Install dependencies?`,
          });
          if (isCancel(installDeps)) {
            cancel("Operation cancelled");
            process.exit(0);
          }
          if (installDeps) {
            const s = spinner({ indicator: "dots" });
            if (packageManagerPreference === undefined) {
              packageManagerPreference = await getPackageManager();
            }
            s.start(
              `Installing dependencies with ${chalk.bold(
                packageManagerPreference,
              )}`,
            );
            try {
              const start = Date.now();
              await installDependencies({
                dependencies: dependencies,
                packageManager: packageManagerPreference,
                cwd: cwd,
              });
              s.stop(
                `✅ Dependencies installed ${chalk.gray(
                  `(${formatMilliseconds(Date.now() - start)})`,
                )}`,
              );
            } catch (error: unknown) {
              s.stop(`❌ Installation failed`);
              log.error(getErrorMessage(error));
              process.exit(1);
            }
          }
        }
      } catch (error) {
        log.error(`Failed to create agent config: ${filePath}`);
        console.error(error);
        process.exit(1);
      }
    } else if (createConfig === "no") {
      log.info(`Skipping agent config`);
    }
  } else {
    log.message();
    log.success(`Found agent config ${chalk.gray(`(${configPath})`)}`);
    log.message();
  }

  // ===== agent client path =====

  const clientFilenames = [
    "agent-client.ts",
    "agent-client.tsx",
    "agent-client.js",
    "agent-client.jsx",
    "client.ts",
    "client.tsx",
    "client.js",
    "client.jsx",
  ];

  // Calculate scoped paths to prioritize client files in the same directory as config
  const configDirectoryRelative = configPath
    ? path.relative(cwd, path.dirname(configPath))
    : null;
  const normalizedConfigDirectory =
    configDirectoryRelative !== null
      ? configDirectoryRelative.split(path.sep).join("/")
      : null;
  const configScopedClientPaths =
    normalizedConfigDirectory === null
      ? []
      : clientFilenames.map((file) =>
          normalizedConfigDirectory === ""
            ? file
            : `${normalizedConfigDirectory}/${file}`,
        );

  const agentClientConfigPath =
    findConfigPath({
      cwd,
      filenames: clientFilenames,
      directories: ["lib/server", "server", "lib", "utils"],
      scopedPaths: configScopedClientPaths,
      getPriority: (candidate: string) => {
        const normalizedCandidate = candidate.replace(/\\/g, "/");
        // Highest priority: same directory as agent config
        if (normalizedConfigDirectory !== null) {
          if (
            normalizedConfigDirectory === "" &&
            !normalizedCandidate.includes("/")
          ) {
            return -1;
          }
          if (
            normalizedConfigDirectory !== "" &&
            normalizedCandidate.startsWith(`${normalizedConfigDirectory}/`)
          ) {
            return -1;
          }
        }
        // Standard priorities
        if (normalizedCandidate.startsWith("src/lib/")) return 0;
        if (normalizedCandidate.startsWith("app/lib/")) return 1;
        if (normalizedCandidate.startsWith("src/")) return 2;
        if (normalizedCandidate.startsWith("app/")) return 3;
        if (!normalizedCandidate.includes("/")) return 5;
        return 4;
      },
    }) || null;

  if (!agentClientConfigPath) {
    const createClientConfig = await select({
      message: `Create agent client config?`,
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    if (isCancel(createClientConfig)) {
      cancel(`Operation cancelled`);
      process.exit(0);
    }
    if (createClientConfig === "yes") {
      const agentClientDirectory =
        configPath !== "" ? path.dirname(configPath) : cwd;
      await fs.ensureDir(agentClientDirectory);
      const newAgentClientConfigPath = path.join(
        agentClientDirectory,
        "agent-client.ts",
      );
      log.info(`Creating: ${newAgentClientConfigPath}`);
      try {
        const contents =
          await getDefaultAgentClientConfig(
            //   {
            //   framework: framework,
            // }
          );
        await fs.writeFile(newAgentClientConfigPath, contents);
        log.success(`✅ Agent client config created`);
      } catch (error) {
        log.error(
          `Failed to create agent client config: ${newAgentClientConfigPath}`,
        );
        log.error(JSON.stringify(error, null, 2));
        process.exit(1);
      }
    } else if (createClientConfig === "no") {
      log.info(`Skipping agent client config`);
    }
  } else {
    log.success(
      `Found agent client config ${chalk.gray(`(${agentClientConfigPath})`)}`,
    );
  }

  if (targetEnvFile !== "none") {
    try {
      const fileContents = await fs.readFile(
        path.join(cwd, targetEnvFile),
        "utf8",
      );
      const parsed = parse(fileContents);
      let isMissingModelProviderApiKey = false;
      if (parsed.MODEL_PROVIDER_API_KEY === undefined)
        isMissingModelProviderApiKey = true;
      if (isMissingModelProviderApiKey) {
        const txt = chalk.bold(`MODEL_PROVIDER_API_KEY`);
        log.warn(`Missing ${txt} in ${targetEnvFile}`);

        const addApiKey = await select({
          message: `Add ${txt} to ${targetEnvFile}?`,
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
            { label: "Choose other file(s)", value: "other" },
          ],
        });
        if (isCancel(addApiKey)) {
          cancel(`Operation cancelled`);
          process.exit(0);
        }
        const envs: string[] = [];
        if (isMissingModelProviderApiKey) {
          envs.push("MODEL_PROVIDER_API_KEY");
        }
        if (addApiKey === "yes") {
          try {
            await updateEnvs({
              files: [path.join(cwd, targetEnvFile)],
              envs: envs,
              isCommented: false,
            });
          } catch (error) {
            log.error(`Failed to add ENV variables to ${targetEnvFile}`);
            log.error(JSON.stringify(error, null, 2));
            process.exit(1);
          }
          log.success(`✅ ENV variables added`);
        } else if (addApiKey === "no") {
          log.info(`Skipping ENV setup`);
        } else if (addApiKey === "other") {
          if (!envFiles.length) {
            cancel("No env files found. Create one first");
            process.exit(0);
          }
          const envFilesToUpdate = await multiselect({
            message: "Select .env files to update:",
            options: envFiles.map((x) => ({
              value: path.join(cwd, x),
              label: x,
            })),
            required: false,
          });
          if (isCancel(envFilesToUpdate)) {
            cancel("Operation cancelled");
            process.exit(0);
          }
          if (envFilesToUpdate.length === 0) {
            log.info("Skipping .env updates");
          } else {
            try {
              await updateEnvs({
                files: envFilesToUpdate,
                envs: envs,
                isCommented: false,
              });
            } catch (error) {
              log.error(`Failed to update .env files`);
              log.error(JSON.stringify(error, null, 2));
              process.exit(1);
            }
            log.success(`✅ ENV files updated`);
          }
        }
      }
    } catch {
      // if fails, ignore, and do not proceed with ENV operations.
    }
  }

  outro(outroText);
  console.log();
  process.exit(0);
}

// ===== Init Command =====

export const init = new Command("init")
  .option("-c, --cwd <cwd>", "The working directory.", process.cwd())
  .option(
    "--config <config>",
    "The path to the agent configuration file. defaults to the first `agent.ts` file found.",
  )
  .option("--skip-db", "Skip the database setup.")
  .option(
    "--package-manager <package-manager>",
    "The package manager you want to use.",
  )
  .action(initAction);

async function getLatestNpmVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);

    if (!response.ok) {
      throw new Error(`Package not found: ${response.statusText}`);
    }

    const data = await response.json();
    return data["dist-tags"].latest; // Get the latest version from dist-tags
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error));
  }
}

async function getPackageManager() {
  const { hasBun, hasPnpm } = await checkPackageManagers();
  if (!hasBun && !hasPnpm) return "npm";

  const packageManagerOptions: {
    value: "bun" | "pnpm" | "yarn" | "npm";
    label?: string;
    hint?: string;
  }[] = [];

  if (hasPnpm) {
    packageManagerOptions.push({
      value: "pnpm",
      label: "pnpm",
      hint: "recommended",
    });
  }
  if (hasBun) {
    packageManagerOptions.push({
      value: "bun",
      label: "bun",
    });
  }
  packageManagerOptions.push({
    value: "npm",
    hint: "not recommended",
  });

  const packageManager = await select({
    message: "Choose a package manager",
    options: packageManagerOptions,
  });
  if (isCancel(packageManager)) {
    cancel(`Operation cancelled.`);
    process.exit(0);
  }
  return packageManager;
}

async function getEnvFiles(cwd: string) {
  const files = await fs.readdir(cwd);
  return files.filter((x) => x.startsWith(".env"));
}

async function updateEnvs({
  envs,
  files,
  isCommented,
}: {
  /**
   * The ENVs to append to the file
   */
  envs: string[];
  /**
   * Full file paths
   */
  files: string[];
  /**
   * Weather to comment the all of the envs or not
   */
  isCommented: boolean;
}) {
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const lines = content.split("\n");
    const newLines = envs.map(
      (x) =>
        `${isCommented ? "# " : ""}${x}=${
          getEnvDescription(x) ?? `"some_value"`
        }`,
    );
    newLines.push("");
    newLines.push(...lines);
    await fs.writeFile(file, newLines.join("\n"), "utf8");
  }

  function getEnvDescription(env: string) {
    if (env === "DATABASE_HOST") {
      return `"The host of your database"`;
    }
    if (env === "DATABASE_PORT") {
      return `"The port of your database"`;
    }
    if (env === "DATABASE_USER") {
      return `"The username of your database"`;
    }
    if (env === "DATABASE_PASSWORD") {
      return `"The password of your database"`;
    }
    if (env === "DATABASE_NAME") {
      return `"The name of your database"`;
    }
    if (env === "DATABASE_URL") {
      return `"The URL of your database"`;
    }
    if (env === "MODEL_PROVIDER_API_KEY") {
      return `"" # Your Model Provider API key, e.g. from OpenRouter (https://openrouter.ai)`;
    }
  }
}
