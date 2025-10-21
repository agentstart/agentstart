"use client";

import type { DBThread } from "agentstart/db";
import { useParams, useRouter } from "next/navigation";
import type React from "react";
import { AgentStartProvider } from "@/components/agent/provider";
import { Sidebar } from "@/components/agent/sidebar/sidebar";
import { client } from "@/lib/agent-client";

interface ProviderProps {
  children?: React.ReactNode;
}
export function Provider({ children }: ProviderProps) {
  const router = useRouter();
  const navigate = router.push;
  const { threadId } = useParams<{ threadId: string }>();

  const onSelectThread = (thread: DBThread) => {
    navigate(`/thread/${thread.id}`);
  };

  return (
    <AgentStartProvider client={client} navigate={navigate}>
      <Sidebar selectedThreadId={threadId} onSelectThread={onSelectThread}>
        {children}
      </Sidebar>
    </AgentStartProvider>
  );
}
