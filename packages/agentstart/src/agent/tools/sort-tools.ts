/* agent-frontmatter:start
AGENT: Tools utility functions
PURPOSE: Shared utility functions for processing and transforming tool collections
USAGE: Import processSortedTools to sort tools and add provider options
EXPORTS: processSortedTools
FEATURES:
  - Sorts tools alphabetically by name
  - Adds providerOptions to the last tool for cache control
  - Type-safe tool transformation
SEARCHABLE: tools processing, sort tools, provider options, cache control
agent-frontmatter:end */

import type { ToolSet } from "ai";

export const sortTools = <T extends ToolSet>(tools: T): T => {
  // Get entries and sort in one pass
  const entries = Object.entries(tools).sort(([nameA], [nameB]) =>
    nameA.localeCompare(nameB),
  );

  // If there are tools, add providerOptions to the last one
  if (entries.length > 0) {
    const lastIndex = entries.length - 1;
    const lastEntry = entries[lastIndex];

    if (lastEntry) {
      const [toolName, toolValue] = lastEntry;
      entries[lastIndex] = [
        toolName,
        {
          ...toolValue,
          providerOptions: {
            anthropic: {
              cacheControl: { type: "ephemeral" as const },
            },
          },
        },
      ];
    }
  }

  // Reconstruct sorted tools object
  return Object.fromEntries(entries) as T;
};
