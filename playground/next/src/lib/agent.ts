import { Agent, createAgent, memoryAdapter } from "@agent-stack/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("Missing OPENROUTER_API_KEY");
}
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const instance = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions: "You are a helpful assistant.",
});

export const agent = createAgent({
  memory: memoryAdapter(),
  instance,
});
