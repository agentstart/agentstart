/* agent-frontmatter:start
AGENT: Build configuration module
PURPOSE: Configures tsdown bundling for the core AgentStart package.
USAGE: Consumed by tsdown during package builds.
EXPORTS: default
FEATURES:
  - Lists bundle entrypoints across package submodules
  - Defines module aliasing and build formats
SEARCHABLE: packages, agentstart, tsdown, config, build
agent-frontmatter:end */

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/agent/index.ts",
    "./src/api/index.ts",
    "./src/blob/index.ts",
    "./src/blob/vercel.ts",
    "./src/blob/s3.ts",
    "./src/client/index.ts",
    "./src/memory/index.ts",
    "./src/memory/drizzle.ts",
    "./src/memory/prisma.ts",
    "./src/memory/kysely.ts",
    "./src/memory/mongodb.ts",
    "./src/memory/in-memory.ts",
    "./src/memory/redis.ts",
    "./src/memory/secondary-in-memory.ts",
    "./src/memory/upstash.ts",
    "./src/memory/vercel-kv.ts",
    "./src/prompts/index.ts",
    "./src/integration/index.ts",
    "./src/integration/nextjs.ts",
    "./src/integration/nodejs.ts",
    "./src/sandbox/index.ts",
    "./src/sandbox/nodejs.ts",
    "./src/sandbox/e2b.ts",
  ],
  dts: true,
  unbundle: true,
  exports: true,
  format: ["cjs", "esm"],
  alias: {
    "@": "./src",
  },
  ignoreWatch: ["node_modules", "dist", ".cache", ".turbo"],
});
