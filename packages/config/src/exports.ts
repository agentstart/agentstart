// AGENT: Convenient exports for specific config sections
// USAGE: import { siteConfig, pricingConfig, pricingPlans } from '@acme/config'

import { config } from "./loader";
import type { PricingPlan, PricingConfig, SiteConfig } from "./types";

// Site configuration
export const siteConfig: SiteConfig = config.site || {
  name: "Agent Stack",
  description: "Agent-First Next.js Fullstack Template",
};

// Pricing configuration
export const pricingConfig: PricingConfig = config.pricing || {
  title: "Pricing",
  description: "Choose the plan that works for you",
  subtitle: "Individual Plans",
  name: "pricing",
  annualDiscount: "Save 20%",
  plans: [],
};

// Pricing plans (for backward compatibility)
export const pricingPlans: PricingPlan[] = pricingConfig.plans || [];

// Full config export
export { config as appConfig } from "./loader";
