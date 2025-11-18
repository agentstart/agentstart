"use client";

import type { AgentStartUIMessage, AgentUsageSummary } from "agentstart/agent";
import { useAgentStartContext } from "agentstart/client";
import { Conversation } from "@/components/agent/conversation";
import {
  PromptInput,
  type PromptInputLayout,
} from "@/components/agent/prompt-input";
import { useThread } from "@/lib/agent-client";

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
  const { threadId: contextThreadId } = useAgentStartContext();
  const layout: PromptInputLayout = "mobile";

  const activeThreadId = contextThreadId ?? threadIdProp;
  useThread(activeThreadId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="mx-auto flex size-full max-w-full flex-1 flex-col">
          <Conversation initialMessages={initialMessages} layout={layout} />

          <div className="sticky inset-x-0 bottom-0 pb-4">
            <PromptInput
              className="mx-auto"
              layout={layout}
              showUsage={false}
              initialUsage={initialUsage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
