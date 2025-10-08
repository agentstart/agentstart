/* agent-frontmatter:start
AGENT: Client-side authentication initialization
PURPOSE: Create Better Auth client with plugins
USAGE: const authClient = initAuthClient()
PLUGINS:
  - emailOTPClient: Email OTP verification
  - stripeClient: Subscription management
RETURNS: Configured auth client for React
SEARCHABLE: auth client, client auth, authentication client
agent-frontmatter:end */

import { stripeClient } from "@better-auth/stripe/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/* agent-frontmatter:start
AGENT: Initialize auth client with plugins
CUSTOMIZATION: Add or remove plugins as needed
agent-frontmatter:end */
export function initAuthClient() {
  const client = createAuthClient({
    plugins: [emailOTPClient(), stripeClient({ subscription: true })],
  });

  return client;
}
