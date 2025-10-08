/* agent-frontmatter:start
AGENT: Authentication package environment configuration
PURPOSE: Type-safe environment variables for auth package
FEATURES:
  - Auth secret validation
  - OAuth provider credentials
  - Stripe integration keys
USAGE: import { env } from '@acme/auth/env'
REQUIRED: AUTH_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
OPTIONAL: OAuth provider credentials (GitHub, Google, etc.)
SEARCHABLE: auth env, environment variables, oauth config
agent-frontmatter:end */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";
import { env as emailEnv } from "@acme/email/env";

export const env = createEnv({
  extends: [emailEnv],
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production"]).optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),

    // OAuth providers - all optional
    // GitHub
    AUTH_GITHUB_CLIENT_ID: z.string().min(1).optional(),
    AUTH_GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    // Google
    AUTH_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // Discord
    AUTH_DISCORD_CLIENT_ID: z.string().min(1).optional(),
    AUTH_DISCORD_CLIENT_SECRET: z.string().min(1).optional(),

    // Apple
    AUTH_APPLE_CLIENT_ID: z.string().min(1).optional(),
    AUTH_APPLE_CLIENT_SECRET: z.string().min(1).optional(),

    // Microsoft
    AUTH_MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    AUTH_MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),

    // Facebook
    AUTH_FACEBOOK_CLIENT_ID: z.string().min(1).optional(),
    AUTH_FACEBOOK_CLIENT_SECRET: z.string().min(1).optional(),

    // Twitter
    AUTH_TWITTER_CLIENT_ID: z.string().min(1).optional(),
    AUTH_TWITTER_CLIENT_SECRET: z.string().min(1).optional(),

    // LinkedIn
    AUTH_LINKEDIN_CLIENT_ID: z.string().min(1).optional(),
    AUTH_LINKEDIN_CLIENT_SECRET: z.string().min(1).optional(),

    // Spotify
    AUTH_SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
    AUTH_SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),

    // Twitch
    AUTH_TWITCH_CLIENT_ID: z.string().min(1).optional(),
    AUTH_TWITCH_CLIENT_SECRET: z.string().min(1).optional(),

    // GitLab
    AUTH_GITLAB_CLIENT_ID: z.string().min(1).optional(),
    AUTH_GITLAB_CLIENT_SECRET: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
