import type { AgentStackOptions } from "@agent-stack/agent";
import { drizzleAdapter, prismaAdapter } from "@agent-stack/infra/adapter";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { generateDrizzleSchema } from "../generators/drizzle";
import { generateMigrations } from "../generators/kysely";
import { generatePrismaSchema } from "../generators/prisma";

describe("generate", async () => {
  it("should generate prisma schema", async () => {
    const schema = await generatePrismaSchema({
      file: "test.prisma",
      adapter: prismaAdapter(
        {},
        {
          provider: "postgresql",
        },
      )({} as AgentStackOptions),
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
      )({} as AgentStackOptions),
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
      )({} as AgentStackOptions),
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
      )({} as AgentStackOptions),
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
      // biome-ignore lint/suspicious/noExplicitAny: is fine
      adapter: {} as any,
    });
    expect(schema.code).toMatchSnapshot();
  });
});
