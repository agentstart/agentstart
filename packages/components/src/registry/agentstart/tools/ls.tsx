/* agent-frontmatter:start
AGENT: Ls tool UI component
PURPOSE: Display directory listings from the ls tool with file metadata
USAGE: <Ls part={toolPart} />
EXPORTS: Ls, LsProps
FEATURES:
  - Renders file/directory/symlink entries with appropriate icons
  - Shows file sizes and modification dates
  - Distinguishes file types with color-coded icons
  - Displays tool execution state (pending/success/error)
SEARCHABLE: ls tool, directory listing, file browser ui
agent-frontmatter:end */

import { formatDate, formatSize } from "@agentstart/utils";
import { FileIcon, FolderIcon, LinkIcon } from "@phosphor-icons/react";
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { useCallback, useMemo } from "react";
import { Shimmer } from "../shimmer";
import { Steps, StepsContent, StepsItem, StepsTrigger } from "../steps";

export interface LsProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "ls">>>;
}

export function Ls({ part: { state, input, output } }: LsProps) {
  const isLoading = ["input-streaming", "input-available"].includes(state);

  const getIcon = useCallback((entryType: "file" | "directory" | "symlink") => {
    switch (entryType) {
      case "directory":
        return <FolderIcon className="size-4" weight="duotone" />;
      case "symlink":
        return <LinkIcon className="size-4" weight="duotone" />;
      default:
        return <FileIcon className="size-4" weight="duotone" />;
    }
  }, []);

  const entries = useMemo(() => {
    if (!Array.isArray(output?.metadata?.entries)) return null;
    type LsEntry = {
      type: "file" | "directory" | "symlink";
      name: string;
      size: number;
      modifiedTime: number;
    };
    const entries = output.metadata.entries as LsEntry[];

    return (
      <div>
        {entries.length > 0 ? (
          <div className="space-y-0.5 font-mono text-xs">
            {entries.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50"
              >
                {getIcon(entry.type)}
                <span className="w-12 text-right text-muted-foreground">
                  {entry.type === "directory" ? "-" : formatSize(entry.size)}
                </span>
                <span className="text-muted-foreground">
                  {formatDate(entry.modifiedTime)}
                </span>
                <span
                  className={
                    entry.type === "directory"
                      ? "font-medium text-muted-foreground"
                      : "text-foreground"
                  }
                >
                  {entry.name}
                  {entry.type === "directory" && "/"}
                  {entry.type === "symlink" && " →"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">
            Directory is empty
          </span>
        )}
      </div>
    );
  }, [getIcon, output?.metadata]);

  return (
    <Steps data-tool-ls>
      <StepsTrigger
        leftIcon={<FolderIcon weight="duotone" className="size-4" />}
        loading={isLoading}
        error={output?.status === "error" || Boolean(output?.error)}
      >
        <div className="flex items-center gap-2">
          <span>Directory: </span>
          <code className="font-mono text-xs">{input?.path || "/"}</code>
          <div className="text-muted-foreground text-xs">
            {output?.metadata?.count || 0} item
            {(output?.metadata?.count || 0) !== 1 && "s"}
          </div>
        </div>
      </StepsTrigger>
      <StepsContent>
        {isLoading && (
          <StepsItem className="flex items-center gap-2 text-muted-foreground text-xs">
            <Shimmer>Listing directory...</Shimmer>
          </StepsItem>
        )}
        {entries && <StepsItem>{entries}</StepsItem>}
        {output?.error?.message && (
          <StepsItem className="text-red-600 text-xs">
            {output.error.message}
          </StepsItem>
        )}
      </StepsContent>
    </Steps>
  );
}
