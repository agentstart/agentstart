"use client";

import { Conversation } from "@/components/agent/conversation";
import { AgentStartProvider } from "@/components/agent/provider";
import { mockClient, mockNavigate } from "./mock-client";

export function ConversationDemo() {
  return (
    <AgentStartProvider client={mockClient} navigate={mockNavigate}>
      <div className="h-[450px] rounded-lg border border-border bg-muted/10">
        <Conversation threadId="demo-thread-1" />
      </div>
    </AgentStartProvider>
  );
}
