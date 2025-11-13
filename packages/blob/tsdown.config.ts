/* agent-frontmatter:start
AGENT: Build configuration module
PURPOSE: Configures tsdown bundling for the shared utils package.
USAGE: Read by tsdown during package build.
EXPORTS: default
FEATURES:
  - Defines entrypoints and export formats for utilities
  - Applies package-level bundling defaults
SEARCHABLE: packages, utils, tsdown, config, build
agent-frontmatter:end */

import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/vercel.ts", "./src/s3.ts"],
  unbundle: true,
  exports: true,
  ignoreWatch: ["node_modules", "dist", ".cache", ".turbo"],
});
