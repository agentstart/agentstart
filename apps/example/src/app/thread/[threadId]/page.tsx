/* agent-frontmatter:start
AGENT: Playground thread page
PURPOSE: Client page that renders a conversation view for a specific thread.
USAGE: Mounted under /thread/[threadId] to show historical messages and prompt input.
EXPORTS: default
FEATURES:
  - Subscribes to thread state via custom hooks
  - Connects prompt submission to the agent client store
SEARCHABLE: playground, next, src, app, thread, [threadid], page
agent-frontmatter:end */

import { headers } from "next/headers";

import { redirect } from "next/navigation";
import { start } from "@/lib/agent";
import Thread from "./thread";

export default async function Page({
  params,
}: PageProps<"/thread/[threadId]">) {
  const { threadId } = await params;

  try {
    const initialMessages = await start.api.message.get(
      { threadId },
      { context: { headers: await headers() } },
    );
    return <Thread threadId={threadId} initialMessages={initialMessages} />;
  } catch {
    redirect("/");
  }
}
