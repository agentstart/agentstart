/* agent-frontmatter:start
AGENT: AgentStart Vitest configuration
PURPOSE: Ensure Vitest resolves workspace aliases when running package tests
USAGE: Automatically loaded by Vitest via package script
EXPORTS: default
FEATURES:
  - Maps @ alias to the local src directory
  - Runs tests in a Node environment
SEARCHABLE: vitest config, alias resolution, test runner setup
agent-frontmatter:end */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
});
