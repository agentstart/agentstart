"use client";

import type { AgentStartUIMessage, AgentUsageSummary } from "agentstart/agent";
import { useState } from "react";
import { Conversation } from "@/components/agent/conversation";
import { FileExplorer } from "@/components/agent/file-explorer";
import { PromptInput } from "@/components/agent/prompt-input";
import { useThread } from "@/lib/agent-client";

interface ThreadProps {
  threadId: string;
  initialMessages?: AgentStartUIMessage[];
  initialUsage?: AgentUsageSummary;
}

export default function Thread({
  threadId,
  initialMessages,
  initialUsage,
}: ThreadProps) {
  useThread(threadId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-full">
      {/* File Explorer Sidebar */}
      <div
        className={`border-r transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        {isSidebarOpen && (
          <FileExplorer
            threadId={threadId}
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

      {/* Main Content */}
      <div className="mx-auto flex h-full w-full max-w-full flex-1 flex-col">
        {/* Toggle Button */}
        <div className="border-b p-2">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rounded px-3 py-1 text-sm hover:bg-accent"
          >
            {isSidebarOpen ? "Hide" : "Show"} Files
          </button>
        </div>

        <Conversation
          threadId={threadId}
          initialMessages={initialMessages}
          contentClassName="pb-48"
        />

        <div className="sticky inset-x-0 bottom-0 pb-4">
          <PromptInput
            className="mx-auto"
            threadId={threadId}
            initialUsage={initialUsage}
          />
        </div>
      </div>
    </div>
  );
}
