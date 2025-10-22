/* agent-frontmatter:start
AGENT: Playground utility
PURPOSE: Provides a Tailwind-friendly className merger utility.
USAGE: Use to combine conditional class names in React components.
EXPORTS: cn
FEATURES:
  - Leverages clsx and tailwind-merge for deduplication
  - Keeps class merging centralized for UI components
SEARCHABLE: playground, next, src, lib, utils, tailwind, classnames
agent-frontmatter:end */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
