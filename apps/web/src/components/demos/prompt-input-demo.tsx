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

import { AgentStartProvider } from "agentstart/client";
import { PromptInput } from "@/components/agent/prompt-input";
import { mockClient, mockNavigate } from "./mock-client";

export function PromptInputDemo() {
  return (
    <AgentStartProvider client={mockClient} navigate={mockNavigate}>
      <div className="bg-background">
        <PromptInput />
      </div>
    </AgentStartProvider>
  );
}
