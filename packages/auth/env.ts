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
  experimental__runtimeEnv: {},
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
