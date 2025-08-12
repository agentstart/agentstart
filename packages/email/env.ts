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
