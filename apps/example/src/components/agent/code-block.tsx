/* agent-frontmatter:start
AGENT: Code block component with syntax highlighting
PURPOSE: Render syntax-highlighted code snippets with line numbers and copy functionality
USAGE: <CodeBlock code={code} language="typescript" showLineNumbers copyCode={originalCode} />
EXPORTS: CodeBlock, CodeBlockCopyButton, highlightCode
FEATURES:
  - Dual-theme syntax highlighting (light/dark) using Shiki
  - Optional line number display
  - Copy-to-clipboard button with success feedback
  - Separate copyCode prop to copy original content without diff markers
  - Supports all Shiki bundled languages and diff notation
SEARCHABLE: code block, syntax highlighting, shiki, copy button, diff
agent-frontmatter:end */

"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { transformerNotationDiff } from "@shikijs/transformers";
import { useTheme } from "agentstart/client";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BundledLanguage,
  codeToHtml,
  type ShikiTransformer,
} from "shiki/bundle/web";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  showDiff?: boolean;
  /** Original code without diff markers for copying */
  copyCode?: string;
};

type CodeBlockContextType = {
  code: string;
  copyCode: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
  copyCode: "",
});

const lineNumberTransformer: ShikiTransformer = {
  name: "line-numbers",
  line(node, line) {
    node.children.unshift({
      type: "element",
      tagName: "span",
      properties: {
        className: [
          "inline-block",
          "min-w-10",
          "mr-4",
          "text-right",
          "select-none",
          "text-muted-foreground",
        ],
      },
      children: [{ type: "text", value: String(line) }],
    });
  },
};

export async function highlightCode({
  code,
  language,
  showLineNumbers = false,
  showDiff = false,
}: {
  code: string;
  language: BundledLanguage;
  showLineNumbers: boolean;
  showDiff: boolean;
}) {
  const transformers: ShikiTransformer[] = [];

  if (showLineNumbers) {
    transformers.push(lineNumberTransformer);
  }

  if (showDiff) {
    transformers.push(transformerNotationDiff());
  }

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: "vitesse-light",
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: "vesper",
      transformers,
    }),
  ]);
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  showCopyButton = true,
  showDiff = false,
  copyCode,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>("");
  const [darkHtml, setDarkHtml] = useState<string>("");
  const mounted = useRef(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    highlightCode({ code, language, showLineNumbers, showDiff }).then(
      ([light, dark]) => {
        if (!mounted.current) {
          setHtml(light);
          setDarkHtml(dark);
          mounted.current = true;
        }
      },
    );

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers, showDiff]);

  return (
    <CodeBlockContext.Provider value={{ code, copyCode: copyCode ?? code }}>
      <div
        className={cn(
          "group/code-block relative max-h-[200px] overflow-hidden rounded-lg border text-foreground",
          "[&_.diff.add]:bg-green-500/10 [&_.diff.add]:text-green-600 [&_.diff.add]:before:absolute [&_.diff.add]:before:left-1 [&_.diff.add]:before:content-['+']",
          "[&_.diff.remove]:bg-red-500/10 [&_.diff.remove]:text-red-600 [&_.diff.remove]:opacity-70 [&_.diff.remove]:before:absolute [&_.diff.remove]:before:left-1 [&_.diff.remove]:before:content-['-']",
          "dark:[&_.diff.add]:bg-green-500/20 dark:[&_.diff.add]:text-green-400",
          "dark:[&_.diff.remove]:bg-red-500/20 dark:[&_.diff.remove]:text-red-400",
          className,
        )}
        {...props}
      >
        <ScrollArea className="max-h-[200px]">
          <div
            className={cn(
              "[&>pre]:m-0 [&>pre]:bg-background! [&>pre]:text-foreground! [&>pre]:text-sm",
              "[&_code]:wrap-break-word [&_code]:block [&_code]:w-full [&_code]:border-none [&_code]:font-mono [&_code]:text-sm [&_code]:leading-normal",
              "[&_.line]:relative [&_.line]:inline-block [&_.line]:w-full [&_.line]:px-4",
            )}
            dangerouslySetInnerHTML={{
              __html: resolvedTheme === "dark" ? darkHtml : html,
            }}
          />
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </ScrollArea>
        {showCopyButton && (
          <CodeBlockCopyButton className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/code-block:opacity-100" />
        )}
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { copyCode } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(copyCode);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? (
    <CheckIcon weight="bold" />
  ) : (
    <CopyIcon weight="duotone" />
  );

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};
