import { Agent } from "@agent-stack/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createUIMessageStreamResponse, type UIMessage } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const {
    message,
    chatId,
    projectId,
  }: { message: UIMessage; chatId: string; projectId: string } =
    await req.json();

  const agent = new Agent({
    model: openrouter("x-ai/grok-4-fast"),
    instructions: "You are a helpful assistant.",
  });

  const stream = await agent.stream({ message, chatId, projectId });

  return createUIMessageStreamResponse({ stream });
}
