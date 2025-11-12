/* agent-frontmatter:start
AGENT: Prompt system exports
PURPOSE: Main entry point for built-in prompt factories
USAGE: import { createDeveloperPrompt, createResearchPrompt } from 'agentstart/prompts'
FEATURES:
  - All scenario-based prompts
  - Type definitions for customization
  - Self-documenting factory functions
EXPORTS: All prompt factories and type definitions
agent-frontmatter:end */

// Prompt factories (advanced usage)
export { createAnalysisPrompt } from "./analysis";
export { createCreativePrompt } from "./creative";
export { createDeveloperPrompt } from "./developer";
export { createPlanningPrompt } from "./planning";
export { createResearchPrompt } from "./research";
export { createSupportPrompt } from "./support";
export { createTeachingPrompt } from "./teaching";
// Template system (for custom scenarios)
export type { BasePromptTemplate } from "./template";
export { createBaseTemplate, generateFromTemplate } from "./template";
// Type definitions
export type {
  AnalysisPromptConfig,
  CodingPromptConfig,
  CreativePromptConfig,
  PlanningPromptConfig,
  PromptFactory,
  ResearchPromptConfig,
  SupportPromptConfig,
  TeachingPromptConfig,
} from "./types";
export type { Scenario, UnifiedPromptConfig } from "./unified";
// Unified API - Single entry point (recommended)
export { builder, createAgentPrompt, detectScenario } from "./unified";
