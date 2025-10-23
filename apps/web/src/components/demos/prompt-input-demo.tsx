"use client";

import { PromptInput } from "@/components/agent/prompt-input";
import { AgentStartProvider } from "@/components/agent/provider";
import { mockClient, mockNavigate } from "./mock-client";

export function PromptInputDemo() {
  return (
    <AgentStartProvider client={mockClient} navigate={mockNavigate}>
      <div className="rounded-lg border border-border bg-background">
        <PromptInput threadId="demo-thread-1" />
      </div>
    </AgentStartProvider>
  );
}
