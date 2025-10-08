/* agent-frontmatter:start
AGENT: defineConfig function for type-safe configuration
USAGE: import { defineConfig } from '@acme/config'
agent-frontmatter:end */

import type { AppConfig } from "./types";

export function defineConfig(config: AppConfig): AppConfig {
  return config;
}
