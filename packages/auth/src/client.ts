import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export function initAuthClient() {
  const client = createAuthClient({
    plugins: [emailOTPClient(), stripeClient({ subscription: true })],
  });

  return client;
}
