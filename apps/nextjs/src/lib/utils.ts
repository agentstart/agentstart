// AGENT: Utility functions for the application
// PURPOSE: Common helper functions used across components
// SEARCHABLE: utils, helpers, cn, classnames

import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// AGENT: Merge Tailwind CSS classes with proper precedence
// USAGE: cn("text-red-500", condition && "bg-blue-500", { "p-4": isActive })
// PURPOSE: Combine class names while handling conflicts (twMerge) and conditionals (clsx)
// RETURNS: Merged and deduplicated className string
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
