/* agent-frontmatter:start
AGENT: Server-side authentication initialization with Better Auth
PURPOSE: Configure and initialize authentication system with database, email, and Stripe
USAGE: const auth = initAuth({ baseUrl, productionUrl, secret, socialProviders })
FEATURES:
  - Email/password authentication
  - OAuth social providers (GitHub, Google)
  - Email OTP verification
  - Stripe subscription integration
  - Password reset flow
REQUIRES: Database connection, email service (Resend), optional Stripe
SEARCHABLE: auth server, better auth, authentication setup
agent-frontmatter:end */

import "server-only";

import consola from "consola";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, emailOTP } from "better-auth/plugins";
import { stripe as betterAuthStripe } from "@better-auth/stripe";
import Stripe from "stripe";

import { resend } from "@acme/email";
import { pricingPlans, siteConfig } from "@acme/config";
import {
  SignInEmail,
  EmailVerificationEmail,
  ForgotPasswordEmail,
} from "@acme/email/templates";
import { db } from "@acme/db/client";
import { env } from "../env";

export interface AuthOptions {
  baseUrl: string;
  productionUrl: string;
  secret?: string;
  socialProviders?: BetterAuthOptions["socialProviders"];
  trustedOrigins?: string[];
}

export function initAuth(options: AuthOptions) {
  const {
    baseUrl,
    productionUrl,
    secret,
    socialProviders = {},
    trustedOrigins = [],
  } = options;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
    }),
    baseURL: baseUrl,
    secret,
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
      expiresIn: 60 * 60 * 24 * 14, // 14 days
      updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
    },
    plugins: [
      oAuthProxy({
        /**
         * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
         */
        currentURL: baseUrl,
        productionURL: productionUrl,
      }),

      emailOTP({
        sendVerificationOnSignUp: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          const name = siteConfig.name;
          let emailTemplate;
          let subject = `[${name}] `;

          if (type === "sign-in") {
            emailTemplate = SignInEmail({
              validationCode: otp,
              name,
              url: baseUrl,
              expiresIn: 300, // 5 minutes in seconds
            });
            subject += `Sign in to ${name}`;
          } else if (type === "email-verification") {
            emailTemplate = EmailVerificationEmail({
              validationCode: otp,
              name,
              url: baseUrl,
              expiresIn: 86400, // 24 hours in seconds
            });
            subject += `Verify your email for ${name}`;
          } else if (type === "forget-password") {
            emailTemplate = ForgotPasswordEmail({
              validationCode: otp,
              name,
              url: baseUrl,
              expiresIn: 3600, // 1 hour in seconds
            });
            subject += `Reset your ${name} password`;
          } else {
            // Default to sign-in template
            emailTemplate = SignInEmail({
              validationCode: otp,
              name,
              url: baseUrl,
              expiresIn: 300, // 5 minutes in seconds
            });
            subject += `Sign in to ${name}`;
          }

          const { data, error } = await resend.emails.send({
            from: `${name} <${env.EMAIL_FROM}>`,
            to: email,
            subject,
            react: emailTemplate,
          });

          if (error) {
            throw new Error(error.message);
          }
          if (data) {
            consola.success(`Email sent to ${email}`);
          }
        },
      }),

      betterAuthStripe({
        stripeClient: stripe,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: pricingPlans,
        },
      }),
    ],
    socialProviders,
    trustedOrigins,
  });
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
  typescript: true,
});

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
