/* agent-frontmatter:start
AGENT: Convenient exports for specific config sections
USAGE: import { siteConfig, pricingConfig, pricingPlans, i18nConfig } from '@acme/config'
agent-frontmatter:end */

import { config } from "./loader";
import type { PricingPlan, PricingConfig, SiteConfig, I18nConfig } from "./types";

// Site configuration
export const siteConfig: SiteConfig = config.site || {
  name: "Agent Stack",
  title: "Agent Stack",
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

// i18n configuration
export const i18nConfig: I18nConfig = config.i18n || {
  defaultLocale: "en",
  locales: [
    { code: "en", name: "English", nativeName: "English" },
  ],
};

// Full config export
export { config as appConfig } from "./loader";
