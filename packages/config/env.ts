/* agent-frontmatter:start
AGENT: Config package environment variables
PURPOSE: Type-safe Stripe price IDs configuration
USAGE: import { env } from '@acme/config/env'
VARIABLES:
  - NEXT_PUBLIC_PRO_PRICE_ID: Stripe Pro plan monthly price ID
  - NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID: Stripe Pro plan annual price ID
  - NEXT_PUBLIC_ULTRA_PRICE_ID: Stripe Ultra plan monthly price ID
  - NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID: Stripe Ultra plan annual price ID
SEARCHABLE: config env, stripe price ids, pricing configuration
agent-frontmatter:end */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).optional(),
  },
  client: {
    NEXT_PUBLIC_PRO_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_ULTRA_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_PRO_PRICE_ID: process.env.NEXT_PUBLIC_PRO_PRICE_ID,
    NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID:
      process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID,
    NEXT_PUBLIC_ULTRA_PRICE_ID: process.env.NEXT_PUBLIC_ULTRA_PRICE_ID,
    NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID:
      process.env.NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
