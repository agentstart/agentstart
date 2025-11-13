"use client";

import type { AgentStartUIMessage, AgentUsageSummary } from "agentstart/agent";
import { useAgentStartContext } from "agentstart/client";
import { useEffect } from "react";
import { Conversation } from "@/components/agent/conversation";
import { PromptInput } from "@/components/agent/prompt-input";
import { useThread } from "@/lib/agent-client";
import { Header } from "./header";

interface ThreadProps {
  threadId?: string;
  initialMessages?: AgentStartUIMessage[];
  initialUsage?: AgentUsageSummary;
}

export default function Thread({
  threadId: threadIdProp,
  initialMessages,
  initialUsage,
}: ThreadProps) {
  const { threadId, setThreadId } = useAgentStartContext();

  // Sync prop to Context if provided
  useEffect(() => {
    if (threadIdProp && threadIdProp !== threadId) {
      setThreadId(threadIdProp);
    }
  }, [threadIdProp, threadId, setThreadId]);

  // Only call useThread if threadId exists
  useThread(threadId);

  return (
    <div className="flex h-full flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="mx-auto flex size-full max-w-full flex-1 flex-col">
          <Conversation
            initialMessages={initialMessages}
            contentClassName="pb-48"
          />

          <div className="sticky inset-x-0 bottom-0 pb-4">
            <PromptInput className="mx-auto" initialUsage={initialUsage} />
          </div>
        </div>
      </div>
    </div>
  );
}
