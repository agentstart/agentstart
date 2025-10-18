/* agent-frontmatter:start
AGENT: Agent Start CLI generator
PURPOSE: Compose Agent Start configuration files with optional database wiring
USAGE: await generateConfig({ current_user_config, format, spinner, database })
EXPORTS: generateConfig, Import
FEATURES:
  - Formats existing agent config using the caller supplied formatter
  - Injects adapter imports and database configuration when requested
  - Provides string helpers for safe insertion without full AST parsing
SEARCHABLE: cli generator, agent config, database generator
agent-frontmatter:end */

import { logger } from "@agentstart/utils";
import type { spinner as clackSpinner } from "@clack/prompts";
import type { SupportedDatabases } from "../commands/init";

export type Import = {
  path: string;
  variables:
    | { asType?: boolean; name: string; as?: string }[]
    | { asType?: boolean; name: string; as?: string };
};

type Format = (code: string) => Promise<string>;

type CommonIndexConfig = {
  regex: RegExp;
  getIndex: (args: {
    matchIndex: number;
    match: RegExpMatchArray;
  }) => number | null;
};

const START_OF_AGENT_START: CommonIndexConfig = {
  regex: /defineAgentConfig\({()/m,
  getIndex: ({ matchIndex }) => matchIndex + "defineAgentConfig({".length,
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

export async function generateConfig({
  format,
  current_user_config,
  spinner,
  database,
}: {
  format: Format;
  current_user_config: string;
  spinner: ReturnType<typeof clackSpinner>;
  database: SupportedDatabases | null;
}): Promise<{
  generatedCode: string;
  dependencies: string[];
  envs: string[];
}> {
  // Central place for side-effectful mutations applied to the user config string.
  const configGeneration = {
    // Add import statements before formatting so downstream generators stay readable.
    addImport: async (opts: {
      imports: Import[];
      config: string;
    }): Promise<{ code: string; dependencies: string[]; envs: string[] }> => {
      let importString = "";
      for (const import_ of opts.imports) {
        if (Array.isArray(import_.variables)) {
          importString += `import { ${import_.variables
            .map(
              (x) =>
                `${x.asType ? "type " : ""}${x.name}${
                  x.as ? ` as ${x.as}` : ""
                }`,
            )
            .join(", ")} } from "${import_.path}";\n`;
        } else {
          importString += `import ${import_.variables.asType ? "type " : ""}${
            import_.variables.name
          }${import_.variables.as ? ` as ${import_.variables.as}` : ""} from "${
            import_.path
          }";\n`;
        }
      }
      try {
        const newContent = await format(importString + opts.config);
        return { code: newContent, dependencies: [], envs: [] };
      } catch (error) {
        throw new Error(
          `Failed to generate new agent config during import addition phase.`,
          { cause: error },
        );
      }
    },
    // Inject the database adapter snippet and capture follow-up dependencies/envs.
    addDatabase: async (opts: {
      database: SupportedDatabases;
      config: string;
    }): Promise<{ code: string; dependencies: string[]; envs: string[] }> => {
      const requiredEnvs: string[] = [];
      const requiredDeps: string[] = [];
      let databaseCode = "";

      const addDb = async ({
        db_code,
        dependencies,
        envs,
        imports,
        code_before_agentStart,
      }: {
        imports: Import[];
        db_code: string;
        envs: string[];
        dependencies: string[];
        code_before_agentStart?: string;
      }) => {
        if (code_before_agentStart) {
          const startOfAgentStart = getGroupInfo(
            opts.config,
            START_OF_AGENT_START,
          );
          if (!startOfAgentStart) {
            throw new Error(
              "[addDb] Couldn't find start of agentStart() function.",
            );
          }
          opts.config = insertContent({
            line: startOfAgentStart.line - 1,
            character: 0,
            content: opts.config,
            insert_content: `\n${code_before_agentStart}\n`,
          });
        }

        const codeGen = await configGeneration.addImport({
          config: opts.config,
          imports,
        });
        opts.config = codeGen.code;
        databaseCode = db_code;
        requiredEnvs.push(...envs, ...codeGen.envs);
        requiredDeps.push(...dependencies, ...codeGen.dependencies);
      };

      if (opts.database === "sqlite") {
        await addDb({
          db_code: `new Database(process.env.DATABASE_URL || "database.sqlite")`,
          dependencies: ["better-sqlite3"],
          envs: ["DATABASE_URL"],
          imports: [
            {
              path: "better-sqlite3",
              variables: {
                asType: false,
                name: "Database",
              },
            },
          ],
        });
      } else if (opts.database === "postgres") {
        await addDb({
          db_code: `new Pool({\nconnectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/database"\n})`,
          dependencies: ["pg"],
          envs: ["DATABASE_URL"],
          imports: [
            {
              path: "pg",
              variables: [
                {
                  asType: false,
                  name: "Pool",
                },
              ],
            },
          ],
        });
      } else if (opts.database === "mysql") {
        await addDb({
          db_code: `createPool(process.env.DATABASE_URL!)`,
          dependencies: ["mysql2"],
          envs: ["DATABASE_URL"],
          imports: [
            {
              path: "mysql2/promise",
              variables: [
                {
                  asType: false,
                  name: "createPool",
                },
              ],
            },
          ],
        });
      } else if (opts.database === "mssql") {
        const dialectCode = `new MssqlDialect({
            tarn: {
              ...Tarn,
              options: {
              min: 0,
              max: 10,
              },
            },
            tedious: {
              ...Tedious,
              connectionFactory: () => new Tedious.Connection({
              authentication: {
                options: {
                password: 'password',
                userName: 'username',
                },
                type: 'default',
              },
              options: {
                database: 'some_db',
                port: 1433,
                trustServerCertificate: true,
              },
              server: 'localhost',
              }),
            },
          })`;
        await addDb({
          code_before_agentStart: dialectCode,
          db_code: `dialect`,
          dependencies: ["tedious", "tarn", "kysely"],
          envs: ["DATABASE_URL"],
          imports: [
            {
              path: "tedious",
              variables: {
                name: "*",
                as: "Tedious",
              },
            },
            {
              path: "tarn",
              variables: {
                name: "*",
                as: "Tarn",
              },
            },
            {
              path: "kysely",
              variables: [
                {
                  name: "MssqlDialect",
                },
              ],
            },
          ],
        });
      } else if (
        opts.database === "drizzle:mysql" ||
        opts.database === "drizzle:sqlite" ||
        opts.database === "drizzle:pg"
      ) {
        await addDb({
          db_code: `drizzleAdapter(db, {\nprovider: "${opts.database.replace(
            "drizzle:",
            "",
          )}",\n})`,
          dependencies: [],
          envs: [],
          imports: [
            {
              path: "agentstart/db",
              variables: [
                {
                  name: "drizzleAdapter",
                },
              ],
            },
            {
              path: "./database.ts",
              variables: [
                {
                  name: "db",
                },
              ],
            },
          ],
        });
      } else if (
        opts.database === "prisma:mysql" ||
        opts.database === "prisma:sqlite" ||
        opts.database === "prisma:postgresql"
      ) {
        await addDb({
          db_code: `prismaAdapter(client, {\nprovider: "${opts.database.replace(
            "prisma:",
            "",
          )}",\n})`,
          dependencies: [`@prisma/client`],
          envs: [],
          code_before_agentStart: "const client = new PrismaClient();",
          imports: [
            {
              path: "agentstart/db",
              variables: [
                {
                  name: "prismaAdapter",
                },
              ],
            },
            {
              path: "@prisma/client",
              variables: [
                {
                  name: "PrismaClient",
                },
              ],
            },
          ],
        });
      } else if (opts.database === "mongodb") {
        await addDb({
          db_code: `mongodbAdapter(db)`,
          dependencies: ["mongodb"],
          envs: [`DATABASE_URL`],
          code_before_agentStart: [
            `const client = new MongoClient(process.env.DATABASE_URL || "mongodb://localhost:27017/database");`,
            `const db = client.db();`,
          ].join("\n"),
          imports: [
            {
              path: "agentstart/db",
              variables: [
                {
                  name: "mongodbAdapter",
                },
              ],
            },
            {
              path: "mongodb",
              variables: [
                {
                  name: "MongoClient",
                },
              ],
            },
          ],
        });
      }

      const startOfAgentStart = getGroupInfo(opts.config, START_OF_AGENT_START);
      if (!startOfAgentStart) {
        throw new Error(
          "[addDatabase] Couldn't find start of agentStart() function.",
        );
      }
      const newContent = insertContent({
        line: startOfAgentStart.line,
        character: startOfAgentStart.character,
        content: opts.config,
        insert_content: `memory: ${databaseCode},`,
      });

      try {
        const formatted = await format(newContent);
        return {
          code: formatted,
          dependencies: requiredDeps,
          envs: requiredEnvs,
        };
      } catch (error) {
        throw new Error(
          `Failed to generate new agent config during database addition phase.`,
          { cause: error },
        );
      }
    },
  };

  let newUserConfig: string;
  try {
    newUserConfig = await format(current_user_config);
  } catch (error) {
    spinner.stop(
      `Failed to format agent config before database generation.`,
      1,
    );
    logger.error(getErrorMessage(error));
    process.exit(1);
  }

  const totalDependencies: string[] = [];
  const totalEnvs: string[] = [];

  if (database) {
    try {
      const { code, dependencies, envs } = await configGeneration.addDatabase({
        config: newUserConfig,
        database,
      });
      newUserConfig = code;
      totalDependencies.push(...dependencies);
      totalEnvs.push(...envs);
    } catch (error) {
      spinner.stop(
        `Something went wrong while generating/updating your new agent config file.`,
        1,
      );
      logger.error(getErrorMessage(error));
      process.exit(1);
    }
  }

  return {
    generatedCode: newUserConfig,
    dependencies: totalDependencies,
    envs: totalEnvs,
  };
}

function insertContent(params: {
  line: number;
  character: number;
  content: string;
  insert_content: string;
}): string {
  const { line, character, content, insert_content } = params;
  const lines = content.split("\n");

  if (line < 1 || line > lines.length) {
    throw new Error("Invalid line number");
  }

  const targetLineIndex = line - 1;

  if (character < 0 || character > lines[targetLineIndex]!.length) {
    throw new Error("Invalid character index");
  }

  const targetLine = lines[targetLineIndex]!;
  const updatedLine =
    targetLine.slice(0, character) +
    insert_content +
    targetLine.slice(character);
  lines[targetLineIndex] = updatedLine;

  return lines.join("\n");
}

function getGroupInfo(
  content: string,
  commonIndexConfig: CommonIndexConfig,
): {
  line: number;
  character: number;
  index: number;
} | null {
  const { regex, getIndex } = commonIndexConfig;
  const match = regex.exec(content);
  if (!match) return null;

  const groupIndex = getIndex({ matchIndex: match.index, match });
  if (groupIndex === null) return null;

  const position = getPosition(content, groupIndex);
  return {
    line: position.line,
    character: position.character,
    index: groupIndex,
  };
}

const getPosition = (str: string, index: number) => {
  const lines = str.slice(0, index).split("\n");
  return {
    line: lines.length,
    character: lines[lines.length - 1]!.length,
  };
};
