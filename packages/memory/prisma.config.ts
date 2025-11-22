/* agent-frontmatter:start
AGENT: Prisma test configuration
PURPOSE: Configure Prisma CLI for memory adapter sqlite tests
USAGE: Loaded by Prisma CLI commands in this package
EXPORTS: default
FEATURES:
  - Points Prisma at the test schema
  - Sets a local sqlite datasource for generate/db push
SEARCHABLE: prisma config, memory adapter, sqlite test
agent-frontmatter:end */

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/prisma/test/schema.prisma",
  datasource: {
    url: "file:./src/prisma/test/.db/dev.db",
  },
});
