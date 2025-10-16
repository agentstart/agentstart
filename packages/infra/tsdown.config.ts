import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/adapter/index.ts", "./src/db/index.ts", "./src/kv/index.ts"],
  unbundle: true,
  dts: true,
});
