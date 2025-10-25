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
import type { Tools } from "agentstart/agent";
import type { InferUITools, ToolUIPart } from "ai";
import { FileIcon, FolderIcon, LinkIcon } from "lucide-react";
import { Tool, ToolContent, ToolHeader, ToolOutput } from "./tool";

export interface LsProps {
  part: ToolUIPart<InferUITools<Pick<Tools, "ls">>>;
}

export function Ls({
  part: { type, state, input, output, errorText },
}: LsProps) {
  const getIcon = (entryType: "file" | "directory" | "symlink") => {
    switch (entryType) {
      case "directory":
        return <FolderIcon className="h-3 w-3 text-blue-600" />;
      case "symlink":
        return <LinkIcon className="h-3 w-3 text-purple-600" />;
      default:
        return <FileIcon className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const renderEntries = () => {
    if (!Array.isArray(output?.metadata?.entries)) return null;
    type LsEntry = {
      type: "file" | "directory" | "symlink";
      name: string;
      size: number;
      modifiedTime: number;
    };
    const entries = output.metadata.entries as LsEntry[];

    return (
      <div className="mt-1">
        <div className="mb-1 text-muted-foreground text-xs">
          {output.metadata?.count || 0} item
          {(output.metadata?.count || 0) !== 1 && "s"}
        </div>
        {entries.length > 0 ? (
          <div className="max-h-[400px] space-y-0.5 overflow-y-auto font-mono text-xs">
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
                      ? "font-medium text-blue-600"
                      : ""
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
  };

  return (
    <Tool>
      <ToolHeader type={type} state={state} />
      <ToolContent>
        <ToolOutput
          output={
            <div>
              <div className="mb-2 text-xs">
                <span className="text-muted-foreground">Directory: </span>
                <code className="font-mono">{input?.path || "/"}</code>
              </div>
              {renderEntries()}
            </div>
          }
          errorText={errorText}
        />
      </ToolContent>
    </Tool>
  );
}
