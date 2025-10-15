import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/db/index.ts",
    "./src/client/index.ts",
    "./src/adapters/drizzle/index.ts",
    "./src/adapters/kysely/index.ts",
    "./src/adapters/mongodb/index.ts",
    "./src/adapters/prisma/index.ts",
    "./src/adapters/memory/index.ts",
  ],
  unbundle: true,
  dts: true,
  format: ["cjs", "esm"],
  loader: {
    ".md": "text",
  },
});
