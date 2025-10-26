/* agent-frontmatter:start
AGENT: Agent persistence test helper
PURPOSE: Provides a Prisma client instance for adapter integration tests.
USAGE: Import within adapter tests to execute Prisma-backed scenarios.
EXPORTS: default
FEATURES:
  - Constructs a reusable PrismaClient for test suites
  - Ensures adapters can exercise Prisma-backed data flows
SEARCHABLE: packages, agentstart, src, db, adapter, prisma, test, client
agent-frontmatter:end */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export default prisma;
