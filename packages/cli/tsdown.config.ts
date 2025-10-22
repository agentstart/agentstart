/* agent-frontmatter:start
AGENT: Build configuration module
PURPOSE: Configures tsdown bundling for the AgentStart CLI package.
USAGE: Consumed by tsdown to produce CommonJS and ESM bundles.
EXPORTS: default
FEATURES:
  - Declares entrypoints for CLI distribution builds
  - Enables aliasing and watch ignore patterns for packaging
SEARCHABLE: packages, cli, tsdown, config, build
agent-frontmatter:end */

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  unbundle: true,
  exports: true,
  ignoreWatch: ["node_modules", "dist", ".cache", ".turbo"],
});
