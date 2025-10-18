/* agent-frontmatter:start
AGENT: Memory adapter test
PURPOSE: Run the adapter conformance suite against the in-memory adapter
USAGE: pnpm test memory adapter
EXPORTS:
FEATURES:
  - Exercises shared adapter suite with in-memory storage
SEARCHABLE: memory adapter test, thread message
agent-frontmatter:end */

import { describe } from "vitest";
import { memoryAdapter } from "@/db/adapter/memory/memory-adapter";
import { runAdapterTest } from "@/db/adapter/test";

describe("adapter test", async () => {
  const db = {
    thread: [],
    message: [],
  };
  const adapter = memoryAdapter(db);
  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({
        message: {
          fields: {
            parts: "message_parts",
          },
        },
        ...customOptions,
      });
    },
  });
});
