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
    "./src/client/index.ts",
    "./src/db/index.ts",
    "./src/integration/index.ts",
    "./src/kv/index.ts",
    "./src/sandbox/index.ts",
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
