/* agent-frontmatter:start
AGENT: Thread page component
PURPOSE: Server component that fetches thread data and renders thread UI
USAGE: Mounted under /thread/[threadId] to show conversation for specific thread
EXPORTS: default
FEATURES:
  - Fetches thread and message data server-side
  - Passes initial data to client Thread component
  - Redirects to homepage if thread not found
SEARCHABLE: thread, page, server component, thread route
agent-frontmatter:end */

import type { AgentUsageSummary } from "agentstart/agent";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { start } from "@/lib/agent";
import Thread from "./thread";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  try {
    const requestHeaders = await headers();
    const [{ thread }, initialMessages] = await Promise.all([
      start.api.thread.get(
        { threadId },
        { context: { headers: requestHeaders } },
      ),
      start.api.message.get(
        { threadId },
        { context: { headers: requestHeaders } },
      ),
    ]);

    let initialUsage: AgentUsageSummary | undefined;
    if (thread?.lastContext) {
      try {
        initialUsage =
          typeof thread.lastContext === "string"
            ? (JSON.parse(thread.lastContext) as AgentUsageSummary)
            : (thread.lastContext as AgentUsageSummary);
      } catch (parseError) {
        console.error("Failed to parse lastContext:", parseError);
      }
    }

    return (
      <Thread
        threadId={threadId}
        initialMessages={initialMessages}
        initialUsage={initialUsage}
      />
    );
  } catch {
    redirect("/");
  }
}
