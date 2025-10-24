/* agent-frontmatter:start
AGENT: CLI test module
PURPOSE: Exercises AgentStart CLI commands to prevent regressions.
USAGE: Executed with Vitest to validate CLI generators and configuration helpers.
EXPORTS: (none)
FEATURES:
  - Covers critical CLI workflows for schema generation
  - Uses snapshot assertions to track emitted files
SEARCHABLE: packages, cli, src, test, get, config, vitest
agent-frontmatter:end */

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfig } from "../utils/get-config";

let tmpDir = ".";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../../..");

const linkNodeModules = async (targetDir: string) => {
  const source = path.join(repoRoot, "node_modules");
  const destination = path.join(targetDir, "node_modules");
  if (!(await fs.pathExists(destination))) {
    await fs.ensureSymlink(source, destination, "dir");
  }
};

const createAgentModuleSource = (
  dbImportPath: string,
) => `import { agentStart } from "agentstart";
import { prismaAdapter } from "agentstart/db";
import { db } from "${dbImportPath}";

export const start = agentStart({
  memory: prismaAdapter(db, {
    provider: "sqlite",
  }),
});
`;

describe("getConfig", async () => {
  beforeEach(async () => {
    const tmp = path.join(process.cwd(), "getConfig_test-");
    tmpDir = (await fs.mkdtemp(tmp, { encoding: "utf8" })) as string;
    await linkNodeModules(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true });
  });

  it("should resolve resolver type alias", async () => {
    const agentPath = path.join(tmpDir, "server", "agent");
    const dbPath = path.join(tmpDir, "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": ".",
                "paths": {
                  "@server/*": ["./server/*"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("@server/db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve direct alias", async () => {
    const agentPath = path.join(tmpDir, "server", "agent");
    const dbPath = path.join(tmpDir, "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": ".",
                "paths": {
                  "prismaDbClient": ["./server/db/db"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve resolver type alias with relative path", async () => {
    const agentPath = path.join(tmpDir, "test", "server", "agent");
    const dbPath = path.join(tmpDir, "test", "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": "./test",
                "paths": {
                  "@server/*": ["./server/*"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("@server/db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "test/server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve direct alias with relative path", async () => {
    const agentPath = path.join(tmpDir, "test", "server", "agent");
    const dbPath = path.join(tmpDir, "test", "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": "./test",
                "paths": {
                  "prismaDbClient": ["./server/db/db"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "test/server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve with relative import", async () => {
    const agentPath = path.join(tmpDir, "test", "server", "agent");
    const dbPath = path.join(tmpDir, "test", "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": "./test",
                "paths": {
                  "prismaDbClient": ["./server/db/db"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("../db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "test/server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should error with invalid alias", async () => {
    const agentPath = path.join(tmpDir, "server", "agent");
    const dbPath = path.join(tmpDir, "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      `{
              "compilerOptions": {
                /* Path Aliases */
                "baseUrl": ".",
                "paths": {
                  "@server/*": ["./PathIsInvalid/*"]
                }
              }
          }`,
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("@server/db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    await expect(
      getConfig({
        cwd: tmpDir,
        configPath: "server/agent/agent.ts",
        shouldThrowOnError: true,
      }),
    ).rejects.toThrowError();
  });
});
