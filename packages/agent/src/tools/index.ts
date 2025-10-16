import { bash } from "./bash/tool";
import { glob } from "./glob/tool";
import { grep } from "./grep/tool";
import { ls } from "./ls/tool";
import { read } from "./read/tool";
import { todoWrite } from "./todo-write/tool";
import { update } from "./update/tool";
import { write } from "./write/tool";

const tools = {
  update,
  read,
  write,
  bash,
  glob,
  grep,
  ls,
  todoWrite,
} as const;

export const agentTools = () => {
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
  return Object.fromEntries(entries);
};

export type Tools = typeof tools;
