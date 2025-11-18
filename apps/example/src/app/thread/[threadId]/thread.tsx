"use client";

import { FolderSimpleIcon } from "@phosphor-icons/react";
import type { AgentStartUIMessage, AgentUsageSummary } from "agentstart/agent";
import { useAgentStartContext } from "agentstart/client";
import { useState } from "react";
import { Conversation } from "@/components/agent/conversation";
import { FileExplorer } from "@/components/agent/file-explorer";
import { Header } from "@/components/agent/header";
import { PromptInput } from "@/components/agent/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useThread } from "@/lib/agent-client";
import { cn } from "@/lib/utils";

interface ThreadProps {
  threadId: string;
  initialMessages?: AgentStartUIMessage[];
  initialUsage?: AgentUsageSummary;
}

export default function Thread({
  threadId: threadIdProp,
  initialMessages,
  initialUsage,
}: ThreadProps) {
  const { threadId: contextThreadId } = useAgentStartContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeThreadId = contextThreadId ?? threadIdProp;
  useThread(activeThreadId);

  return (
    <div className="flex h-full flex-col">
      {/* Header with File Explorer Toggle */}
      <Header
        trailing={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  title={isSidebarOpen ? "Hide Files" : "Show Files"}
                >
                  <FolderSimpleIcon
                    className="size-4"
                    weight={isSidebarOpen ? "fill" : "regular"}
                  />
                </Button>
              }
            />
            <TooltipContent>
              {isSidebarOpen ? <p>Hide Files</p> : <p>Show Files</p>}
            </TooltipContent>
          </Tooltip>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="mx-auto flex h-full w-full max-w-full flex-1 flex-col">
          <Conversation
            initialMessages={initialMessages}
            contentClassName="pb-48"
          />

          <div className="sticky inset-x-0 bottom-0 pb-4">
            <PromptInput className="mx-auto" initialUsage={initialUsage} />
          </div>
        </div>

        {/* File Explorer Sidebar */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            isSidebarOpen ? "w-64 border-l" : "w-0",
          )}
        >
          {isSidebarOpen && (
            <FileExplorer
              query={{
                path: "/",
                recursive: true,
                ignore: [
                  "node_modules/**",
                  ".next/**",
                  ".git/**",
                  "dist/**",
                  "build/**",
                  "*.log",
                ],
              }}
              onFileClick={(node) => {
                console.log("File clicked:", node);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
