// AGENT: Pricing configuration for the application
// USAGE: import { pricingConfig, pricingPlans } from '@/config/pricing'
// BETTER-AUTH: Uses Better Auth Stripe plugin plan configuration format
// STRIPE: priceId should match your Stripe price IDs

import type { StripePlan } from "@better-auth/stripe";
import { env } from "../env";

export interface PricingPlan extends StripePlan {
  title: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  features: string[];
  button: {
    title: string;
  };
  label?: string;
  isEnterprise?: boolean;
}

export const pricingPlans: PricingPlan[] = [
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
    priceId: env.NEXT_PUBLIC_PRO_PRICE_ID,
    annualDiscountPriceId: env.NEXT_PUBLIC_PRO_ANNUAL_PRICE_ID,
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
    priceId: env.NEXT_PUBLIC_ULTRA_PRICE_ID,
    annualDiscountPriceId: env.NEXT_PUBLIC_ULTRA_ANNUAL_PRICE_ID,
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
];

export const pricingConfig = {
  title: "Pricing",
  description: "Choose the plan that works for you",
  subtitle: "Individual Plans",
  name: "pricing",
  annualDiscount: "Save 20%",
};
