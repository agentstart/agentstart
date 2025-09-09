// AGENT: DB package environment variables
// PURPOSE: Type-safe environment variable configuration
// USAGE: import { env } from '@acme/db/env'
// VARIABLES:
//   - POSTGRES_URL: PostgreSQL database connection URL
// SEARCHABLE: db env, database url, postgres url

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).optional(),
    POSTGRES_URL: z.url(),
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
