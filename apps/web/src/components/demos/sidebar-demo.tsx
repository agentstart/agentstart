"use client";

import { AgentStartProvider } from "@/components/agent/provider";
import { Sidebar } from "@/components/agent/sidebar/sidebar";
import { mockClient, mockNavigate } from "./mock-client";

export function SidebarDemo() {
  return (
    <AgentStartProvider client={mockClient} navigate={mockNavigate}>
      <div className="h-[500px] w-full overflow-hidden rounded-lg border border-border bg-muted/10">
        <Sidebar />
      </div>
    </AgentStartProvider>
  );
}
