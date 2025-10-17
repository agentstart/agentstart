import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Agent, defineAgentConfig } from "agent-stack";
import { drizzleAdapter } from "agent-stack/adapter";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
    schema,
  }),
  appName: "example-nextjs",
  agent,
});
