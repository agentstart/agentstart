"use client";

import type { AgentStartUIMessage } from "agentstart/agent";
import { Conversation } from "@/components/agent/conversation";
import { PromptInput } from "@/components/agent/prompt-input";
import { SuggestedPrompts } from "@/components/agent/suggested-prompts";
import { useThread } from "@/lib/agent-client";

interface ThreadProps {
  threadId: string;
  initialMessages?: AgentStartUIMessage[];
}

export default function Thread({ threadId, initialMessages }: ThreadProps) {
  useThread(threadId);

  return (
    <div className="mx-auto flex h-full w-full max-w-full flex-col">
      <Conversation
        threadId={threadId}
        initialMessages={initialMessages}
        contentClassName="p-4 pb-48"
      />

      <div className="absolute inset-x-0 bottom-0 pb-4">
        <SuggestedPrompts threadId={threadId} />
        <PromptInput className="mx-auto" threadId={threadId} />
      </div>
    </div>
  );
}
