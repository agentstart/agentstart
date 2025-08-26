// AGENT: Main entry point for @acme/config package
// USAGE: import { defineConfig, siteConfig, pricingConfig, pricingPlans } from '@acme/config'

// Export defineConfig function for use in agent-stack.config.ts
export { defineConfig } from "./define-config";

// Export types
export * from "./types";

// Export convenient config sections
export { siteConfig, pricingConfig, pricingPlans, appConfig } from "./exports";
