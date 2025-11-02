"use client";

import { AgentStartProvider } from "agentstart/client";
import { mockClient, mockNavigate } from "./mock-client";

export function ProviderDemo() {
  return (
    <AgentStartProvider client={mockClient} navigate={mockNavigate}>
      <div className="rounded-md bg-muted p-4 text-center text-sm">
        ✓ AgentStartProvider initialized successfully
        <div className="mt-2 text-muted-foreground text-xs">
          Child components can now access the client via useAgentStartContext()
        </div>
      </div>
    </AgentStartProvider>
  );
}
