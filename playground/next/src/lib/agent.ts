import { Agent, createAgent, mongodbAdapter } from "@agent-stack/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { db } from "@/db";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("Missing OPENROUTER_API_KEY");
}
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const instance = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions: "You are a helpful assistant.",
  memory: mongodbAdapter(db),
});

export const agent = createAgent({
  instance,
});
