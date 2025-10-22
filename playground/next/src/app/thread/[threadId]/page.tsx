/* agent-frontmatter:start
AGENT: Playground thread page
PURPOSE: Client page that renders a conversation view for a specific thread.
USAGE: Mounted under /thread/[threadId] to show historical messages and prompt input.
EXPORTS: default
FEATURES:
  - Subscribes to thread state via custom hooks
  - Connects prompt submission to the agent client store
SEARCHABLE: playground, next, src, app, thread, [threadid], page
agent-frontmatter:end */

"use client";

import { useParams } from "next/navigation";
import { Conversation } from "@/components/agent/conversation";
import { PromptInput } from "@/components/agent/prompt-input";
import { useAgentStore, useThread } from "@/lib/agent-client";

export default function Page() {
  useThread();
  const { threadId } = useParams<{ threadId: string }>();

  const sendMessage = useAgentStore((state) => state.sendMessage);

  return (
    <div className="mx-auto flex h-full w-full max-w-full flex-1 flex-col">
      <Conversation threadId={threadId} />

      <div className="pb-3">
        <PromptInput
          threadId={threadId}
          onMessageSubmit={(message) => {
            return sendMessage(
              { text: message?.text ?? "", files: message?.files },
              {
                body: {
                  threadId,
                },
              },
            );
          }}
        />
      </div>
    </div>
  );
}
