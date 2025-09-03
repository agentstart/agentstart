// AGENT: Main configuration file for Agent Stack
// USAGE: All application configuration should be defined here
// IMPORTANT: This file is imported by packages/config and used throughout the app

import { defineConfig } from "@acme/config";

export default defineConfig({
  site: {
    name: "Agent Stack",
    title: "Agent Stack - Agent-First Next.js Fullstack Template",
    description:
      "The first fullstack template built for AI agents, not humans - agent-optimized architecture that makes vibe coding actually work",
    url: "https://agent-stack.dev",
    keywords: ["nextjs", "agent", "fullstack", "template", "ai", "typescript"],
    author: {
      name: "Agent Stack Team",
      email: "contact@agent-stack.dev",
      url: "https://github.com/agent-stack",
    },
  },

  pricing: {
    title: "Pricing",
    description: "Choose the plan that works for you",
    subtitle: "Individual Plans",
    name: "pricing",
    annualDiscount: "Save 20%",
    plans: [
      {
        // Better Auth Stripe configuration
        name: "hobby",
        // UI display configuration
        title: "Hobby",
        tagline: "Includes",
        monthlyPrice: 0,
        annualPrice: 0,
        currency: "usd",
        features: [
          "Pro two-week trial",
          "Limited Agent requests",
          "Limited Tab completions",
        ],
        button: {
          title: "Get Started",
        },
        limits: {
          credits: 10,
        },
      },
      {
        // Better Auth Stripe configuration
        name: "pro",
        priceId: process.env.NEXT_PUBLIC_PRO_PRICE_ID,
        annualDiscountPriceId: process.env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID,
        // UI display configuration
        title: "Pro",
        tagline: "Everything in Hobby, plus",
        monthlyPrice: 20,
        annualPrice: 192, // 20 * 12 * 0.8 (20% off)
        currency: "usd",
        features: [
          "Extended limits on Agent",
          "Unlimited Tab completions",
          "Access to Background Agents",
          "Access to Bugbot",
          "Access to maximum context windows",
        ],
        button: {
          title: "Get Pro",
        },
        limits: {
          credits: 200,
        },
        label: "Popular",
      },
      {
        // Better Auth Stripe configuration
        name: "ultra",
        priceId: process.env.NEXT_PUBLIC_ULTRA_PRICE_ID,
        annualDiscountPriceId: process.env.NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID,
        // UI display configuration
        title: "Ultra",
        tagline: "Everything in Pro, plus",
        monthlyPrice: 200,
        annualPrice: 1920, // 200 * 12 * 0.8 (20% off)
        currency: "usd",
        features: [
          "20x usage on all OpenAI, Claude, Gemini models",
          "Priority access to new features",
        ],
        limits: {
          credits: 2000,
        },
        button: {
          title: "Get Ultra",
        },
      },
    ],
  },
});
