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
import type { BundledLanguage } from "shiki/bundle/web";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full text-base [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      components={{
        pre: ({ children, node, ...props }) => {
          const [firstChild] = node?.children ?? [];

          if (
            firstChild &&
            firstChild.type === "element" &&
            firstChild.tagName === "code" &&
            firstChild.children[0]?.type === "text"
          ) {
            const { className } = firstChild.properties;
            const [, language = "plaintext"] =
              /language-(.+)/.exec(String(className) || "") ?? [];
            const code = firstChild.children[0].value.trim();

            return (
              <pre {...props}>
                <CodeBlock
                  className="my-4"
                  code={code}
                  language={language as BundledLanguage}
                />
              </pre>
            );
          }

          const lang = props.className?.split("language-")[1] ?? "markdown";
          return (
            <pre {...props}>
              <CodeBlock
                className="my-4"
                code={children as string}
                language={lang as BundledLanguage}
              />
            </pre>
          );
        },
      }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";
