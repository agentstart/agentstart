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
import { runAdapterTest } from "../../test";
import { inMemoryAdapter } from "../in-memory-adapter";

describe("adapter test", async () => {
  const db = {
    thread: [],
    message: [],
  };
  const adapter = inMemoryAdapter(db);
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
