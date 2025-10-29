/* agent-frontmatter:start
AGENT: Playground provider component
PURPOSE: Client component that syncs AgentStart provider with Next.js navigation.
USAGE: Wrap ancestors to supply agent client instance and thread-aware sidebar.
EXPORTS: Provider
FEATURES:
  - Uses useParams and router push to navigate threads
  - Injects AgentStartProvider with the preconfigured client
SEARCHABLE: playground, next, src, app, provider, agentstart
agent-frontmatter:end */

"use client";

import type { DBThread } from "agentstart/memory";
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
