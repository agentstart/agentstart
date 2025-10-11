/* agent-frontmatter:start
AGENT: Memory adapter test
PURPOSE: Run the adapter conformance suite against the in-memory adapter
USAGE: pnpm test memory adapter
EXPORTS:
FEATURES:
  - Exercises shared adapter suite with in-memory storage
SEARCHABLE: memory adapter test, project chat message
agent-frontmatter:end */

import { describe } from "vitest";
import { runAdapterTest } from "../../test";
import { memoryAdapter } from "../memory-adapter";

describe("adapter test", async () => {
  const db = {
    project: [],
    chat: [],
    message: [],
  };
  const adapter = memoryAdapter(db);
  await runAdapterTest({
    getAdapter: async (customOptions = {}) => {
      return adapter({
        project: {
          fields: {
            title: "project_title",
          },
        },
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
