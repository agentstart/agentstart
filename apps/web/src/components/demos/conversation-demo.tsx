"use client";

import { AgentStartProvider } from "agentstart/client";
import { Conversation } from "@/components/agent/conversation";
import { mockClient, mockNavigate } from "./mock-client";

const stores = new Map();

export function ConversationDemo() {
  return (
    <AgentStartProvider
      client={mockClient}
      navigate={mockNavigate}
      stores={stores}
    >
      <div className="h-[450px] rounded-lg border border-border bg-muted/10">
        <Conversation />
      </div>
    </AgentStartProvider>
  );
}
