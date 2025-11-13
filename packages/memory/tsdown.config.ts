/* agent-frontmatter:start
AGENT: Build configuration module
PURPOSE: Configures tsdown bundling for the memory adapters package.
USAGE: Read by tsdown during package build.
EXPORTS: default
FEATURES:
  - Defines entrypoints for each memory adapter (drizzle, prisma, kysely, mongodb, in-memory)
  - Defines entrypoints for each secondary memory adapter (redis, upstash, vercel-kv, in-memory)
  - Enables granular imports to avoid bundling unused adapters (e.g., import from '@agentstart/memory/drizzle')
  - Auto-generates package.json exports via tsdown
SEARCHABLE: packages, memory, tsdown, config, build, adapters
agent-frontmatter:end */

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/drizzle/index.ts",
    "./src/prisma/index.ts",
    "./src/kysely/index.ts",
    "./src/mongodb/index.ts",
    "./src/in-memory/index.ts",
    "./src/redis/index.ts",
    "./src/secondary-in-memory/index.ts",
    "./src/upstash/index.ts",
    "./src/vercel-kv/index.ts",
  ],
  unbundle: true,
  exports: true,
  ignoreWatch: ["node_modules", "dist", ".cache", ".turbo"],
});
