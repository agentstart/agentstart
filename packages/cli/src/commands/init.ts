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
      `if (!process.env.OPENROUTER_API_KEY) {
         throw new Error("Missing OPENROUTER_API_KEY");
       }
       const openrouter = createOpenRouter({
         apiKey: process.env.OPENROUTER_API_KEY,
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

type SupportedFrameworks =
  | "vanilla"
  | "react"
  | "vue"
  | "svelte"
  | "solid"
  | "nextjs";

/**
 * Compose the base agent client config wired to the generated server config.
 */
const getDefaultAgentClientConfig = async ({
  framework,
}: {
  framework: SupportedFrameworks;
}) => {
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

const outroText = `🥳 All Done, Happy Hacking!`;

export async function initAction(opts: unknown) {
  console.log();
  intro("👋 Initializing Agent Stack");

  const options = optionsSchema.parse(opts);

  const cwd = path.resolve(options.cwd);
  let packageManagerPreference: "bun" | "pnpm" | "yarn" | "npm" | undefined;

  let config_path: string = "";
  const framework: SupportedFrameworks = "vanilla";

  const format = async (code: string) =>
    await prettierFormat(code, {
      filepath: config_path,
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
    outro("❌ No .env files found. Please create an env file first.");
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
      `Agent Stack requires your tsconfig.json to have "compilerOptions.strict" set to true.`,
    );
    const shouldAdd = await confirm({
      message: `Would you like us to set ${chalk.bold(
        `strict`,
      )} to ${chalk.bold(`true`)}?`,
    });
    if (isCancel(shouldAdd)) {
      cancel(`✋ Operation cancelled.`);
      process.exit(0);
    }
    if (shouldAdd) {
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
        log.success(`🚀 tsconfig.json successfully updated!`);
      } catch (error) {
        log.error(
          `Failed to add "compilerOptions.strict" to your tsconfig.json file.`,
        );
        console.error(error);
        process.exit(1);
      }
    }
  }

  // ===== install agent-stack =====
  const s = spinner({ indicator: "dots" });
  s.start(`Checking agent-stack installation`);

  let latestAgentStackVersion: string;
  try {
    latestAgentStackVersion = await getLatestNpmVersion("agent-stack");
  } catch (error) {
    log.error(`❌ Couldn't get latest version of agent-stack.`);
    console.error(error);
    process.exit(1);
  }

  if (
    !packageInfo.dependencies ||
    !Object.keys(packageInfo.dependencies).includes("agent-stack")
  ) {
    s.stop("Finished fetching latest version of agent-stack.");
    const s2 = spinner({ indicator: "dots" });
    const shouldInstallAgentStackDep = await confirm({
      message: `Would you like to install Agent Stack?`,
    });
    if (isCancel(shouldInstallAgentStackDep)) {
      cancel(`✋ Operation cancelled.`);
      process.exit(0);
    }
    if (packageManagerPreference === undefined) {
      packageManagerPreference = await getPackageManager();
    }
    if (shouldInstallAgentStackDep) {
      s2.start(
        `Installing Agent Stack using ${chalk.bold(packageManagerPreference)}`,
      );
      try {
        const start = Date.now();
        await installDependencies({
          dependencies: ["agent-stack@latest"],
          packageManager: packageManagerPreference,
          cwd: cwd,
        });
        s2.stop(
          `Agent Stack installed ${chalk.greenBright(
            `successfully`,
          )}! ${chalk.gray(`(${formatMilliseconds(Date.now() - start)})`)}`,
        );
      } catch (error: unknown) {
        s2.stop(`Failed to install Agent Stack:`);
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
    s.stop("Finished fetching latest version of agent-stack.");
    const shouldInstallAgentStackDep = await confirm({
      message: `Your current Agent Stack dependency is out-of-date. Would you like to update it? (${chalk.bold(
        packageInfo.dependencies["agent-stack"],
      )} → ${chalk.bold(`v${latestAgentStackVersion}`)})`,
    });
    if (isCancel(shouldInstallAgentStackDep)) {
      cancel(`✋ Operation cancelled.`);
      process.exit(0);
    }
    if (shouldInstallAgentStackDep) {
      if (packageManagerPreference === undefined) {
        packageManagerPreference = await getPackageManager();
      }
      const s = spinner({ indicator: "dots" });
      s.start(
        `Updating Agent Stack using ${chalk.bold(packageManagerPreference)}`,
      );
      try {
        const start = Date.now();
        await installDependencies({
          dependencies: ["agent-stack@latest"],
          packageManager: packageManagerPreference,
          cwd: cwd,
        });
        s.stop(
          `Agent Stack updated ${chalk.greenBright(
            `successfully`,
          )}! ${chalk.gray(`(${formatMilliseconds(Date.now() - start)})`)}`,
        );
      } catch (error: unknown) {
        s.stop(`Failed to update Agent Stack:`);
        log.error(getErrorMessage(error));
        process.exit(1);
      }
    }
  } else {
    s.stop(`Agent Stack dependencies are ${chalk.greenBright(`up-to-date`)}!`);
  }

  // ===== appName =====

  const packageJson = getPackageInfo(cwd);
  let appName: string;
  if (!packageJson.name) {
    const newAppName = await text({
      message: "What is the name of your application?",
    });
    if (isCancel(newAppName)) {
      cancel("✋ Operation cancelled.");
      process.exit(0);
    }
    appName = newAppName;
  } else {
    appName = packageJson.name;
  }

  // ===== config path =====

  let possiblePaths = ["agent.ts", "agent.tsx", "agent.js", "agent.jsx"];
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

  if (options.config) {
    config_path = path.join(cwd, options.config);
  } else {
    for (const possiblePath of possiblePaths) {
      const doesExist = fs.existsSync(path.join(cwd, possiblePath));
      if (doesExist) {
        config_path = path.join(cwd, possiblePath);
        break;
      }
    }
  }

  // ===== create agent config =====
  let current_user_config = "";
  let database: SupportedDatabases | null = null;

  if (!config_path) {
    const shouldCreateAgentConfig = await select({
      message: `Would you like to create an agent config file?`,
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    if (isCancel(shouldCreateAgentConfig)) {
      cancel(`✋ Operation cancelled.`);
      process.exit(0);
    }
    if (shouldCreateAgentConfig === "yes") {
      const shouldSetupDb = await confirm({
        message: `Would you like to set up your ${chalk.bold(`database`)}?`,
        initialValue: true,
      });
      if (isCancel(shouldSetupDb)) {
        cancel(`✋ Operating cancelled.`);
        process.exit(0);
      }
      if (shouldSetupDb) {
        const prompted_database = await select({
          message: "Choose a Database Dialect",
          options: supportedDatabases.map((it) => ({ value: it, label: it })),
        });
        if (isCancel(prompted_database)) {
          cancel(`✋ Operating cancelled.`);
          process.exit(0);
        }
        database = prompted_database;
      }

      const filePath = path.join(cwd, "agent.ts");
      config_path = filePath;
      log.info(`Creating agent config file: ${filePath}`);
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
        config_path = filePath;
        log.success(`🚀 Agent config file successfully created!`);

        if (envs.length !== 0) {
          log.info(
            `There are ${envs.length} environment variables for your database of choice.`,
          );
          const shouldUpdateEnvs = await confirm({
            message: `Would you like us to update your ENV files?`,
          });
          if (isCancel(shouldUpdateEnvs)) {
            cancel("✋ Operation cancelled.");
            process.exit(0);
          }
          if (shouldUpdateEnvs) {
            const filesToUpdate = await multiselect({
              message: "Select the .env files you want to update",
              options: envFiles.map((x) => ({
                value: path.join(cwd, x),
                label: x,
              })),
              required: false,
            });
            if (isCancel(filesToUpdate)) {
              cancel("✋ Operation cancelled.");
              process.exit(0);
            }
            if (filesToUpdate.length === 0) {
              log.info("No .env files to update. Skipping...");
            } else {
              try {
                await updateEnvs({
                  files: filesToUpdate,
                  envs,
                  isCommented: true,
                });
              } catch (error) {
                log.error(`Failed to update .env files:`);
                log.error(JSON.stringify(error, null, 2));
                process.exit(1);
              }
              log.success(`🚀 ENV files successfully updated!`);
            }
          }
        }
        if (dependencies.length !== 0) {
          log.info(
            `There are ${
              dependencies.length
            } dependencies to install. (${dependencies
              .map((x) => chalk.green(x))
              .join(", ")})`,
          );
          const shouldInstallDeps = await confirm({
            message: `Would you like us to install dependencies?`,
          });
          if (isCancel(shouldInstallDeps)) {
            cancel("✋ Operation cancelled.");
            process.exit(0);
          }
          if (shouldInstallDeps) {
            const s = spinner({ indicator: "dots" });
            if (packageManagerPreference === undefined) {
              packageManagerPreference = await getPackageManager();
            }
            s.start(
              `Installing dependencies using ${chalk.bold(
                packageManagerPreference,
              )}...`,
            );
            try {
              const start = Date.now();
              await installDependencies({
                dependencies: dependencies,
                packageManager: packageManagerPreference,
                cwd: cwd,
              });
              s.stop(
                `Dependencies installed ${chalk.greenBright(
                  `successfully`,
                )} ${chalk.gray(
                  `(${formatMilliseconds(Date.now() - start)})`,
                )}`,
              );
            } catch (error: unknown) {
              s.stop(
                `Failed to install dependencies using ${packageManagerPreference}:`,
              );
              log.error(getErrorMessage(error));
              process.exit(1);
            }
          }
        }
      } catch (error) {
        log.error(`Failed to create agent config file: ${filePath}`);
        console.error(error);
        process.exit(1);
      }
    } else if (shouldCreateAgentConfig === "no") {
      log.info(`Skipping agent config file creation.`);
    }
  } else {
    log.message();
    log.success(`Found agent config file. ${chalk.gray(`(${config_path})`)}`);
    log.message();
  }

  // ===== agent client path =====

  let possibleClientPaths = [
    "agent-client.ts",
    "agent-client.tsx",
    "agent-client.js",
    "agent-client.jsx",
    "client.ts",
    "client.tsx",
    "client.js",
    "client.jsx",
  ];
  possibleClientPaths = [
    ...possibleClientPaths,
    ...possibleClientPaths.map((it) => `lib/server/${it}`),
    ...possibleClientPaths.map((it) => `server/${it}`),
    ...possibleClientPaths.map((it) => `lib/${it}`),
    ...possibleClientPaths.map((it) => `utils/${it}`),
  ];
  possibleClientPaths = [
    ...possibleClientPaths,
    ...possibleClientPaths.map((it) => `src/${it}`),
    ...possibleClientPaths.map((it) => `app/${it}`),
  ];

  let agentClientConfigPath: string | null = null;
  for (const possiblePath of possibleClientPaths) {
    const doesExist = fs.existsSync(path.join(cwd, possiblePath));
    if (doesExist) {
      agentClientConfigPath = path.join(cwd, possiblePath);
      break;
    }
  }

  if (!agentClientConfigPath) {
    const choice = await select({
      message: `Would you like to create an agent client config file?`,
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    });
    if (isCancel(choice)) {
      cancel(`✋ Operation cancelled.`);
      process.exit(0);
    }
    if (choice === "yes") {
      agentClientConfigPath = path.join(cwd, "agent-client.ts");
      log.info(`Creating agent client config file: ${agentClientConfigPath}`);
      try {
        const contents = await getDefaultAgentClientConfig({
          framework: framework,
        });
        await fs.writeFile(agentClientConfigPath, contents);
        log.success(`🚀 Agent client config file successfully created!`);
      } catch (error) {
        log.error(
          `Failed to create agent client config file: ${agentClientConfigPath}`,
        );
        log.error(JSON.stringify(error, null, 2));
        process.exit(1);
      }
    } else if (choice === "no") {
      log.info(`Skipping agent client config file creation.`);
    }
  } else {
    log.success(
      `Found agent client config file. ${chalk.gray(
        `(${agentClientConfigPath})`,
      )}`,
    );
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
  }
}
