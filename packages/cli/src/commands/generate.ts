import path from "node:path";
import { getAdapter } from "@agent-stack/infra/db";
import { logger } from "@agent-stack/utils";
import chalk from "chalk";
import { Command } from "commander";
import fs from "fs-extra";
import fsExtra from "fs-extra";
import prompts from "prompts";
import yoctoSpinner from "yocto-spinner";
import { z } from "zod";
import { getGenerator } from "../generators";
import { findConfigPath } from "../utils/find-config-path";
import { getConfig } from "../utils/get-config";

const generateActionSchema = z.object({
  cwd: z.string(),
  config: z.string().optional(),
  output: z.string().optional(),
  y: z.boolean().optional(),
});

export async function generateAction(
  opts: z.infer<typeof generateActionSchema>,
) {
  const options = generateActionSchema.parse(opts);

  const cwd = path.resolve(options.cwd);
  if (!fs.existsSync(cwd)) {
    logger.error(`The directory "${cwd}" does not exist.`);
    process.exit(1);
  }
  const config = await getConfig({
    cwd,
    configPath: options.config,
  });
  if (!config) {
    logger.error(
      "No configuration file found. Add a `agent.ts` file to your project or pass the path to the configuration file using the `--config` flag.",
    );
    return;
  }

  const adapter = await getAdapter(config).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exit(1);
  });
  if (!adapter) {
    return;
  }

  const spinner = yoctoSpinner({ text: "preparing schema..." }).start();

  const schema = await getGenerator({
    adapter,
    file: options.output,
    options: config,
  });

  spinner.stop();
  if (!schema.code) {
    logger.info("Your schema is already up to date.");
    process.exit(0);
  }

  let targetFilePath: string;

  if (options.output) {
    // Use the user-provided output path directly
    targetFilePath = options.output;
  } else {
    // First check whether a schema file with the same name already exists
    const existingSchemaPath = findConfigPath({
      cwd,
      filenames: [schema.fileName],
      directories: ["db", "database", "lib/db", "server/db"],
      getPriority: (candidate: string) => {
        // Priority: src/db > db > src/lib/db > lib/db > src/ > root
        if (candidate.startsWith("src/db/")) return 0;
        if (candidate.startsWith("db/")) return 1;
        if (candidate.startsWith("src/lib/db/")) return 2;
        if (candidate.startsWith("lib/db/")) return 3;
        if (candidate.startsWith("src/")) return 4;
        if (!candidate.includes("/")) return 6;
        return 5;
      },
    });

    if (existingSchemaPath) {
      // Found an existing file, reuse that location
      targetFilePath = existingSchemaPath;
      schema.fileName = path.relative(cwd, existingSchemaPath);
    } else {
      // Not found; choose a new location based on the priority list
      const preferredDirectories = [
        { path: path.join(cwd, "src", "db"), check: path.join(cwd, "src") },
        { path: path.join(cwd, "db"), check: cwd },
      ];

      let targetDirectory = cwd;
      for (const { path: dir, check } of preferredDirectories) {
        if (await fs.pathExists(check)) {
          targetDirectory = dir;
          break;
        }
      }

      targetFilePath = path.join(targetDirectory, schema.fileName);
      schema.fileName = path.relative(cwd, targetFilePath);
    }
  }

  if (schema.append || schema.overwrite) {
    let confirm = options.y;
    if (!confirm) {
      const response = await prompts({
        type: "confirm",
        name: "confirm",
        message: `The file ${
          schema.fileName
        } already exists. Do you want to ${chalk.yellow(
          `${schema.overwrite ? "overwrite" : "append"}`,
        )} the schema to the file?`,
      });
      confirm = response.confirm;
    }

    if (confirm) {
      const exist = fs.existsSync(targetFilePath);
      if (!exist) {
        await fsExtra.mkdir(path.dirname(targetFilePath), {
          recursive: true,
        });
      }
      if (schema.overwrite) {
        await fsExtra.writeFile(targetFilePath, schema.code);
      } else {
        await fsExtra.appendFile(targetFilePath, schema.code);
      }
      logger.success(
        `✅ Schema was ${
          schema.overwrite ? "overwritten" : "appended"
        } successfully!`,
      );
      process.exit(0);
    } else {
      logger.error("Schema generation aborted.");
      process.exit(1);
    }
  }

  let confirm = options.y;

  if (!confirm) {
    const response = await prompts({
      type: "confirm",
      name: "confirm",
      message: `Do you want to generate the schema to ${chalk.yellow(
        schema.fileName,
      )}?`,
      initial: true,
    });
    confirm = response.confirm;
  }

  if (!confirm) {
    logger.error("Schema generation aborted.");
    process.exit(1);
  }

  const dirExist = fs.existsSync(path.dirname(targetFilePath));
  if (!dirExist) {
    await fsExtra.mkdir(path.dirname(targetFilePath), {
      recursive: true,
    });
  }

  await fsExtra.writeFile(targetFilePath, schema.code);
  logger.success(`✅ Schema was generated successfully!`);
  process.exit(0);
}

export const generate = new Command("generate")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option(
    "--config <config>",
    "the path to the configuration file. defaults to the first configuration file found.",
  )
  .option("--output <output>", "the file to output to the generated schema")
  .option("-y, --y", "automatically answer yes to all prompts", false)
  .action(generateAction);
