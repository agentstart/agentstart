/* agent-frontmatter:start
AGENT: Thread page component
PURPOSE: TanStack Start route that fetches thread data and renders thread UI
USAGE: Mounted under /thread/$threadId to show conversation for specific thread
EXPORTS: Route (file-based route)
FEATURES:
  - Fetches thread and message data via server functions (RPC)
  - Uses TanStack Router isomorphic loader
  - Passes initial data to client Thread component
  - Redirects to homepage if thread not found
SEARCHABLE: thread, page, tanstack start, thread route, server function
agent-frontmatter:end */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { AgentUsageSummary } from "agentstart/agent";
import Thread from "@/components/thread";
import { start } from "@/lib/agent";

/**
 * Server function to fetch thread data
 * createServerFn ensures this code only executes on server
 */
const getThreadData = createServerFn()
  .inputValidator((input: { threadId: string }) => input)
  .handler(async ({ data }) => {
    const { threadId } = data;
    const [{ thread }, initialMessages] = await Promise.all([
      start.api.thread.get({ threadId }),
      start.api.message.get({ threadId }),
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

    return {
      thread,
      initialMessages,
      initialUsage,
    } as any; // Type assertion: Bypassing TanStack Router's serialization type check
  });

export const Route = createFileRoute("/thread/$threadId")({
  component: ThreadPage,
  loader: async ({ params }) => {
    try {
      // Isomorphic loader calls server function via RPC
      const data = await getThreadData({ data: { threadId: params.threadId } });
      return data;
    } catch (error) {
      console.error("Failed to fetch thread data:", error);
      throw redirect({ to: "/" });
    }
  },
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { initialMessages, initialUsage } = Route.useLoaderData();

  return (
    <Thread
      threadId={threadId}
      initialMessages={initialMessages}
      initialUsage={initialUsage}
    />
  );
}
