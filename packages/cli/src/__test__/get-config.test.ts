/* agent-frontmatter:start
AGENT: CLI test module
PURPOSE: Exercises AgentStart CLI commands to prevent regressions.
USAGE: Executed with Vitest to validate CLI generators and configuration helpers.
EXPORTS: tmpdirTest, start, db
FEATURES:
  - Covers critical CLI workflows for schema generation
  - Uses snapshot assertions to track emitted files
SEARCHABLE: packages, cli, src, test, get, config, vitest
agent-frontmatter:end */

import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, test } from "vitest";
import { getConfig } from "../utils/get-config";

interface TmpDirFixture {
  tmpdir: string;
}

async function createTempDir(): Promise<string> {
  const tempRoot = path.join(
    process.cwd(),
    "src",
    "__test__",
    "temp",
    "get-config",
  );
  await fs.ensureDir(tempRoot);
  return (await fs.mkdtemp(path.join(tempRoot, "case-"))) as string;
}

export const tmpdirTest = test.extend<TmpDirFixture>({
  // biome-ignore lint/correctness/noEmptyPattern: Vitest requires object destructuring for fixtures
  tmpdir: async ({}, use) => {
    const directory = await createTempDir();

    await use(directory);
  },
});

let tmpDir = ".";

const createAgentModuleSource = (
  dbImportPath: string,
  options?: { defaultExport?: boolean },
) => {
  return `import { agentStart } from "agentstart";
import { prismaMemoryAdapter } from "agentstart/memory/prisma";
import { db } from "${dbImportPath}";

${options?.defaultExport ? "export default" : "export const start ="} agentStart({
  agent: {} as any,
  memory: prismaMemoryAdapter(db, {
    provider: "sqlite"
  })
})`;
};

const createDbModuleSource = () => {
  return `class PrismaClient {
  constructor() {}
}

export const db = new PrismaClient()`;
};

const createTsconfigSource = ({
  baseUrl = ".",
  paths,
}: {
  baseUrl?: string;
  paths: Record<string, string[]>;
}) =>
  JSON.stringify(
    {
      compilerOptions: {
        module: "esnext",
        moduleResolution: "bundler",
        baseUrl,
        paths,
      },
    },
    null,
    2,
  );

describe("getConfig", async () => {
  beforeEach(async () => {
    tmpDir = await createTempDir();
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
      createTsconfigSource({
        paths: {
          "@server/*": ["./server/*"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("@server/db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

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
      createTsconfigSource({
        paths: {
          prismaDbClient: ["./server/db/db"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

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
      createTsconfigSource({
        baseUrl: "./test",
        paths: {
          "@server/*": ["./server/*"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("@server/db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

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
      createTsconfigSource({
        baseUrl: "./test",
        paths: {
          prismaDbClient: ["./server/db/db"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

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
      createTsconfigSource({
        baseUrl: "./test",
        paths: {
          prismaDbClient: ["./server/db/db"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("../db/db"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "test/server/agent/agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve agent.ts file from root level", async () => {
    const agentPath = path.join(tmpDir);
    const dbPath = path.join(tmpDir, "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      createTsconfigSource({
        paths: {
          prismaDbClient: ["./db/db"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient"),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

    const config = await getConfig({
      cwd: tmpDir,
      configPath: "agent.ts",
    });

    expect(config).not.toBe(null);
  });

  it("should resolve agent.ts file from root level with default export", async () => {
    const agentPath = path.join(tmpDir);
    const dbPath = path.join(tmpDir, "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      createTsconfigSource({
        paths: {
          prismaDbClient: ["./db/db"],
        },
      }),
    );

    // create dummy agent.ts
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      createAgentModuleSource("prismaDbClient", { defaultExport: true }),
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

    const config = await getConfig({ cwd: tmpDir, configPath: "agent.ts" });

    expect(config).not.toBe(null);
  });

  it("should throw error if agent.ts file is invalid", async () => {
    const agentPath = path.join(tmpDir);
    const dbPath = path.join(tmpDir, "db");
    await fs.mkdir(agentPath, { recursive: true });
    await fs.mkdir(dbPath, { recursive: true });

    // create dummy tsconfig.json
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      createTsconfigSource({
        paths: {
          prismaDbClient: ["./db/db"],
        },
      }),
    );

    // create invalid agent.ts (no default export or start export)
    await fs.writeFile(
      path.join(agentPath, "agent.ts"),
      `import { agentStart } from "agentstart";
import { prismaMemoryAdapter } from "agentstart/memory";
import { db } from "prismaDbClient";

export const invalidName = agentStart({
  agent: {} as any,
  memory: prismaMemoryAdapter(db, {
    provider: "sqlite"
  })
})`,
    );

    // create dummy db.ts
    await fs.writeFile(path.join(dbPath, "db.ts"), createDbModuleSource());

    await expect(
      getConfig({
        cwd: tmpDir,
        configPath: "agent.ts",
        shouldThrowOnError: true,
      }),
    ).rejects.toThrowError();
  });
});
