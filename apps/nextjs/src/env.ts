/* agent-frontmatter:start
AGENT: Environment variable configuration with type safety
PURPOSE: Validate and type environment variables at build/runtime
USAGE: import { env } from '@/env'
FEATURES:
  - Type-safe env access (env.DATABASE_URL)
  - Build-time validation
  - Extends auth and email env configs
  - Vercel env preset included
ERRORS: Will fail at build if required env vars missing
SEARCHABLE: environment variables, env config, env validation
agent-frontmatter:end */

import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

import { env as dbEnv } from "@acme/db/env";
import { env as authEnv } from "@acme/auth/env";
import { env as emailEnv } from "@acme/email/env";
import { env as apiEnv } from "@acme/api/env";

export const env = createEnv({
  /* agent-frontmatter:start
  AGENT: Inherit environment configs from auth, email, api packages and Vercel
  agent-frontmatter:end */
  extends: [dbEnv, authEnv, emailEnv, apiEnv, vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {},

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
