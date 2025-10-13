import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  unbundle: true,
  noExternal: ["agent-stack", "agent-stack/db", "@agent-stack/utils"],
});
