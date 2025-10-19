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
