/* agent-frontmatter:start
AGENT: Vitest configuration for prompt tests
PURPOSE: Configure test runner for prompt system unit tests
USAGE: Run with: pnpm vitest
FEATURES:
  - Configured for ES modules
  - Excludes node_modules
  - Includes all test files in __tests__
SEARCHABLE: vitest, config, test, unit test
agent-frontmatter:end */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
