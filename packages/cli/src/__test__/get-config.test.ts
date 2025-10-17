import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, test } from "vitest";
import { getConfig } from "../utils/get-config";

interface TmpDirFixture {
  tmpdir: string;
}

async function createTempDir() {
  const tmpdir = path.join(process.cwd(), "test", "getConfig_test-");
  return await fs.mkdtemp(tmpdir);
}

export const tmpdirTest = test.extend<TmpDirFixture>({
  // biome-ignore lint/correctness/noEmptyPattern: Vitest requires object destructuring for fixtures
  tmpdir: async ({}, use) => {
    const directory = await createTempDir();

    await use(directory);

    await fs.rm(directory, { recursive: true });
  },
});

let tmpDir = ".";

describe("getConfig", async () => {
  beforeEach(async () => {
    const tmp = path.join(process.cwd(), "getConfig_test-");
    tmpDir = await fs.mkdtemp(tmp);
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "@server/db/db";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          })
       })`,
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "prismaDbClient";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          }),
       })`,
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "@server/db/db";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          })
       })`,
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "prismaDbClient";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          })
       })`,
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "../db/db";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          })
       })`,
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
      `import {defineAgentConfig} from "agent-stack";
       import {prismaAdapter} from "agent-stack/adapter";      
       import {db} from "@server/db/db";

       export const agentStack = defineAgentConfig({
          memory: prismaAdapter(db, {
              provider: 'sqlite'
          })
       })`,
    );

    // create dummy db.ts
    await fs.writeFile(
      path.join(dbPath, "db.ts"),
      `class PrismaClient {
        constructor() {}
      }
      
      export const db = new PrismaClient()`,
    );

    await expect(() =>
      getConfig({
        cwd: tmpDir,
        configPath: "server/agent/agent.ts",
        shouldThrowOnError: true,
      }),
    ).rejects.toThrowError();
  });

  it("should resolve js config", async () => {
    const agentPath = path.join(tmpDir, "server", "agent");
    const dbPath = path.join(tmpDir, "server", "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.js"),
      `import  { defineAgentConfig } from "agent-stack";

       export const agentStack = defineAgentConfig({
          appName: "test-name",
       })`,
    );
    const config = await getConfig({
      cwd: tmpDir,
      configPath: "server/agent/agent.js",
    });
    expect(config).toMatchObject({
      appName: "test-name",
    });
  });
});
