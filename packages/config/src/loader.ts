/* agent-frontmatter:start
AGENT: Configuration loader that imports agent-stack.config.ts from project root
USAGE: Import config directly from this module
agent-frontmatter:end */

import type { AppConfig } from "./types";

// Direct static import - this will be resolved at build time
// The bundler will handle this import and tree-shake it appropriately
import configData from "../../../agent-stack.config";

// Export the imported config
export const config: AppConfig = configData;
