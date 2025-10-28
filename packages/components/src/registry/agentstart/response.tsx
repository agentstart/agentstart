/* agent-frontmatter:start
AGENT: Markdown response renderer
PURPOSE: Render assistant text parts using Streamdown with stable memoization
USAGE: import { Response } from \"@/components/agent/response\"
EXPORTS: Response
FEATURES:
  - Applies consistent typography to markdown streams
  - Memoizes children to avoid unnecessary rerenders
SEARCHABLE: markdown renderer, streamdown response, agent output
agent-frontmatter:end */

"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
