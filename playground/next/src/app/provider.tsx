"use client";

import type React from "react";
import { AgentStartProvider } from "@/components/agent/provider";
import { Sidebar } from "@/components/agent/sidebar/sidebar";
import { client } from "@/lib/agent-client";

interface ProviderProps {
  children?: React.ReactNode;
}
export function Provider({ children }: ProviderProps) {
  return (
    <AgentStartProvider client={client}>
      <Sidebar>{children}</Sidebar>
    </AgentStartProvider>
  );
}
