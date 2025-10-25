/* agent-frontmatter:start
AGENT: Prompt input demo component
PURPOSE: Showcase PromptInput component with mock client for documentation
USAGE: <PromptInputDemo />
EXPORTS: PromptInputDemo
FEATURES:
  - Demonstrates prompt input in isolated environment
  - Uses mock AgentStart client and navigation
  - Provides bordered container for visual showcase
SEARCHABLE: prompt input demo, component demo, mock client demo
agent-frontmatter:end */

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
