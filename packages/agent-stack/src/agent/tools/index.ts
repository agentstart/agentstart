/* agent-frontmatter:start
AGENT: Agent tools registry
PURPOSE: Register and configure tools available to the agent
USAGE: Import agentTools() to get the configured tool set
EXPORTS: agentTools
FEATURES:
  - Alphabetically sorts tools by name for consistency
  - Adds Anthropic cache control to the last tool for optimal caching
  - Returns ToolSet compatible with AI SDK
SEARCHABLE: agent tools, tool registry, tool configuration, cache control
agent-frontmatter:end */

import type { ToolSet } from "ai";

export const agentTools = () => {
  const tools: ToolSet = {};

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
  return Object.fromEntries(entries) as ToolSet;
};
