import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Agent, defineAgentConfig } from "agent-stack";
import { drizzleAdapter } from "agent-stack/adapters/drizzle";
import { db } from "@/db";

if (!process.env.MODEL_PROVIDER_API_KEY) {
  throw new Error("Missing MODEL_PROVIDER_API_KEY");
}
const openrouter = createOpenRouter({
  apiKey: process.env.MODEL_PROVIDER_API_KEY,
});
const agent = new Agent({
  model: openrouter("x-ai/grok-4-fast"),
  instructions: "You are a helpful assistant.",
});
export const agentStack = defineAgentConfig({
  memory: drizzleAdapter(db, {
    provider: "pg",
  }),
  appName: "example-nextjs",
  agent,
});
