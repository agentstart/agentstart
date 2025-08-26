// AGENT: Configuration type definitions for agent-stack
// USAGE: Used by defineConfig function and throughout the application

import type { StripePlan } from "@better-auth/stripe";

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

export interface PricingConfig {
  title: string;
  description: string;
  subtitle: string;
  name: string;
  annualDiscount: string;
  plans: PricingPlan[];
}

export interface SiteConfig {
  name: string;
  description: string;
  url?: string;
  keywords?: string[];
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
}

export interface AppConfig {
  site?: SiteConfig;
  pricing?: PricingConfig;
}
