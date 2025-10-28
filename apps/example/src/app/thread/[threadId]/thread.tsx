"use client";

import type { AgentStartUIMessage, AgentUsageSummary } from "agentstart/agent";
import { Conversation } from "@/components/agent/conversation";
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

  return (
    <div className="mx-auto flex h-full w-full max-w-full flex-col">
      <Conversation
        threadId={threadId}
        initialMessages={initialMessages}
        contentClassName="p-4 pb-48"
      />

      <div className="sticky inset-x-0 bottom-0 pb-4">
        <PromptInput
          className="mx-auto"
          threadId={threadId}
          initialUsage={initialUsage}
        />
      </div>
    </div>
  );
}
