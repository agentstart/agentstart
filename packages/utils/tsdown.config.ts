import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  unbundle: true,
  exports: true,
  ignoreWatch: ["node_modules", "dist", ".cache", ".turbo"],
});
