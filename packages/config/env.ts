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
