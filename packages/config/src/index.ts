/* agent-frontmatter:start
AGENT: Main entry point for @agent-stack/config package
USAGE: import { defineConfig, siteConfig, pricingConfig, pricingPlans, i18nConfig } from '@agent-stack/config'
agent-frontmatter:end */

// Export defineConfig function for use in agent-stack.config.ts
export { defineConfig } from "./define-config";
// Export convenient config sections
export {
  appConfig,
  i18nConfig,
  pricingConfig,
  pricingPlans,
  siteConfig,
} from "./exports";
// Export types
export * from "./types";
