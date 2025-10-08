/* agent-frontmatter:start
AGENT: Server-side authentication configuration and initialization
PURPOSE: Handles server authentication with Better Auth, including social providers
USAGE: import { auth } from '@/lib/auth/server'
COMMON TASKS: auth.api.signIn(), auth.api.signOut(), auth.api.getSession()
REQUIRES: AUTH_SECRET in env, optional social provider credentials
RETURNS: Configured auth instance with all server methods
ERRORS: AUTH_SECRET_MISSING if secret not configured
SEARCHABLE: authentication, server auth, better auth, social login, github oauth, google oauth
agent-frontmatter:end */

import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { initAuth } from "@acme/auth";
import { env } from "@/env";
import { siteConfig } from "@acme/config";

const baseUrl =
  env.NODE_ENV === "production"
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const auth = initAuth({
  baseUrl,
  productionUrl: `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? siteConfig.url}`,
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

/* agent-frontmatter:start
AGENT: Get current user session from server components
USAGE: const session = await getSession()
RETURNS: User session object or null if not authenticated
CACHED: React cache ensures single request per render
agent-frontmatter:end */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
