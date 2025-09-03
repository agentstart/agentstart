// AGENT: Config package environment variables
// PURPOSE: Type-safe environment variable configuration
// USAGE: import { env } from '@acme/api/env'
// VARIABLES:
//   - OPENROUTER_API_KEY: OpenRouter API key
// SEARCHABLE: config env, stripe price ids, pricing configuration

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).optional(),
    // AI SDK configuration - at least one provider must be configured
    OPENROUTER_API_KEY: z.string().optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
