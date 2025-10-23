/* agent-frontmatter:start
AGENT: Playground agent bootstrap
PURPOSE: Bootstraps the AgentStart runtime with OpenRouter and Drizzle adapters.
USAGE: Import to obtain the agent handler for API routes.
EXPORTS: start
FEATURES:
  - Configures OpenRouter model provider with API key
  - Connects Drizzle adapter to the playground database schema
SEARCHABLE: playground, next, src, lib, agent, bootstrap, openrouter
agent-frontmatter:end */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { onStart, onSuccess, os } from "@orpc/server";
import { agentStart } from "agentstart";
import { Agent, innerTools, osTools } from "agentstart/agent";
import { drizzleAdapter } from "agentstart/db";
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

// Create custom middleware
const loggingMiddleware = os.middleware(async ({ next }) => {
  console.log("Request started");
  const result = await next();
  console.log("Request completed");
  return result;
});

export const start = agentStart({
  memory: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  appName: "example-nextjs",
  agent,
  middleware: [
    loggingMiddleware,
    onStart(() => console.log("Handler starting")),
    onSuccess(() => console.log("Handler succeeded")),
  ],
  advanced: {
    generateTitle: {
      model: openrouter("x-ai/grok-4-fast"),
    },
    generateSuggestions: {
      model: openrouter("x-ai/grok-4-fast"),
      limit: 5,
    },
  },
});
