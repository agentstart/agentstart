// AGENT: Email package environment configuration
// PURPOSE: Type-safe environment variables for email service
// USAGE: import { env } from '@acme/email/env'
// VARIABLES:
//   - RESEND_API_KEY: Resend service API key (optional)
//   - EMAIL_FROM: Default sender email address
// SEARCHABLE: email env, resend config, email configuration

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().optional().default("no-reply@agent-stack.dev"),
  },
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
