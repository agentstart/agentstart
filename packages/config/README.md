# @agent-stack/config

Central configuration package for Agent Stack.

## Usage

### Define configuration in root

All configuration is defined in `agent-stack.config.ts` at the project root:

```typescript
// agent-stack.config.ts
import { defineConfig } from "@agent-stack/config";

export default defineConfig({
  site: {
    name: "My App",
    description: "My awesome application",
  },
  pricing: {
    // ... pricing configuration
  },
  features: {
    auth: true,
    payment: true,
    // ... feature flags
  },
});
```

### Use configuration in your app

```typescript
import {
  siteConfig,
  pricingConfig,
  pricingPlans,
  features,
} from "@agent-stack/config";

// Use site config
console.log(siteConfig.name); // "My App"

// Use pricing plans
pricingPlans.forEach((plan) => {
  console.log(plan.title, plan.monthlyPrice);
});

// Check features
if (features.auth) {
  // Auth is enabled
}
```

## Configuration Structure

- **site**: Basic site information (name, description, URL, author)
- **pricing**: Pricing configuration and plans
- **features**: Feature flags to enable/disable parts of the app
- **integrations**: Third-party integration settings (Stripe, Google Analytics, etc.)

## Types

All configuration types are exported from `@agent-stack/config`:

```typescript
import type { AppConfig, PricingPlan, SiteConfig } from "@agent-stack/config";
```
