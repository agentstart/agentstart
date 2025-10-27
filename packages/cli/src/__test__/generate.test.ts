/* agent-frontmatter:start
AGENT: CLI test module
PURPOSE: Exercises AgentStart CLI commands to prevent regressions.
USAGE: Executed with Vitest to validate CLI generators and configuration helpers.
EXPORTS: None
FEATURES:
  - Covers critical CLI workflows for schema generation
  - Uses snapshot assertions to track emitted files
SEARCHABLE: packages, cli, src, test, generate, vitest
agent-frontmatter:end */

import type { AgentStartOptions } from "agentstart";
import { drizzleAdapter, prismaAdapter } from "agentstart/db";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { generateDrizzleSchema } from "../generators/drizzle";
import { generateMigrations } from "../generators/kysely";
import { generatePrismaSchema } from "../generators/prisma";

describe("generate", () => {
  it("should generate prisma schema", async () => {
    const schema = await generatePrismaSchema({
      file: "test.prisma",
      adapter: prismaAdapter(
        {},
        {
          provider: "postgresql",
        },
      )({} as AgentStartOptions),
      options: {
        memory: prismaAdapter(
          {},
          {
            provider: "postgresql",
          },
        ),
      },
    });
    expect(schema.code).toMatchSnapshot();
  });

  it("should generate prisma schema for mongodb", async () => {
    const schema = await generatePrismaSchema({
      file: "test.prisma",
      adapter: prismaAdapter(
        {},
        {
          provider: "mongodb",
        },
      )({} as AgentStartOptions),
      options: {
        memory: prismaAdapter(
          {},
          {
            provider: "mongodb",
          },
        ),
      },
    });
    expect(schema.code).toMatchSnapshot();
  });

  it("should generate prisma schema for mysql", async () => {
    const schema = await generatePrismaSchema({
      file: "test.prisma",
      adapter: prismaAdapter(
        {},
        {
          provider: "mysql",
        },
      )({} as AgentStartOptions),
      options: {
        memory: prismaAdapter(
          {},
          {
            provider: "mongodb",
          },
        ),
      },
    });
    expect(schema.code).toMatchSnapshot();
  });

  it("should generate drizzle schema", async () => {
    const schema = await generateDrizzleSchema({
      file: "test.drizzle",
      adapter: drizzleAdapter(
        {},
        {
          provider: "pg",
          schema: {},
        },
      )({} as AgentStartOptions),
      options: {
        memory: drizzleAdapter(
          {},
          {
            provider: "pg",
            schema: {},
          },
        ),
      },
    });
    expect(schema.code).toMatchSnapshot();
  });

  it("should generate kysely schema", async () => {
    const schema = await generateMigrations({
      file: "test.sql",
      options: {
        memory: new Database(":memory:"),
      },
      adapter: {} as any,
    });
    expect(schema.code).toMatchSnapshot();
  });
});
