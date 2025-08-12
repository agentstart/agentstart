import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@acme/auth";

import { env } from "@/env";

const baseUrl =
  env.NODE_ENV === "production"
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const auth = initAuth({
  baseUrl,
  productionUrl: `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "agent-stack.dev"}`,
  secret: env.AUTH_SECRET,
  socialProviders: {
    github:
      env.AUTH_GITHUB_CLIENT_ID && env.AUTH_GITHUB_CLIENT_SECRET
        ? {
            clientId: env.AUTH_GITHUB_CLIENT_ID,
            clientSecret: env.AUTH_GITHUB_CLIENT_SECRET,
            redirectURI: `${baseUrl}/api/auth/callback/github`,
          }
        : undefined,
    google:
      env.AUTH_GOOGLE_CLIENT_ID && env.AUTH_GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.AUTH_GOOGLE_CLIENT_ID,
            clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET,
            redirectURI: `${baseUrl}/api/auth/callback/google`,
          }
        : undefined,
  },
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
