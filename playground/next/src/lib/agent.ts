import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { drizzleAdapter } from "agent-stack/adapter";
import {
  Agent,
  defineAgentConfig,
  innerTools,
  osTools,
} from "agent-stack/agent";
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
  tools: {
    ...innerTools,
    ...osTools,
  },
});
export const agentStack = defineAgentConfig({
  memory: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  appName: "example-nextjs",
  agent,
});
