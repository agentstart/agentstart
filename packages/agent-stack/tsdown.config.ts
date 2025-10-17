import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/adapter.ts",
    "./src/client.ts",
    "./src/db.ts",
    "./src/integration.ts",
  ],
  dts: true,
  unbundle: true,
  exports: {
    devExports: true,
  },
  format: ["cjs", "esm"],
});
