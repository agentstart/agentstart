/* agent-frontmatter:start
AGENT: Prompt system types
PURPOSE: Type definitions for prompt factories and scenario configurations
USAGE: Import from 'agentstart/prompts' when creating custom prompts
EXPORTS: PromptFactory, CodingPromptConfig, ResearchPromptConfig, etc.
FEATURES:
  - Type-safe prompt factories
  - Configuration interfaces for each scenario
  - Extendable architecture for custom scenarios
SEARCHABLE: prompt types, factory, scenario, configuration
agent-frontmatter:end */

/**
 * Generic prompt factory type
 * Takes a configuration object and returns a string prompt
 */
export type PromptFactory<Config = Record<string, never>> = (
  config: Config,
) => string;

/**
 * Configuration for coding/developer scenarios
 */
export interface CodingPromptConfig {
  /** Current sandbox environment info (e.g., "Node.js 20", "Python 3.11") */
  runtime?: string;
  /** Available programming languages */
  languages?: string[];
  /** Project context or repository info */
  projectContext?: string;
  /** Frameworks/tools available */
  frameworks?: string[];
  /** Custom sections to add to the prompt */
  customSections?: Record<string, string>;
}

/**
 * Configuration for research scenarios
 */
export interface ResearchPromptConfig {
  /** Domain or field of research */
  domain?: string;
  /** Depth of research */
  depth?: "quick" | "detailed" | "comprehensive";
  /** Preferred sources or focus areas */
  sources?: string[];
  /** Time period to focus on */
  timePeriod?: string;
}

/**
 * Configuration for data analysis scenarios
 */
export interface AnalysisPromptConfig {
  /** Type of data being analyzed */
  dataType?: string;
  /** Analysis goals */
  goals?: string[];
  /** Output format preferences */
  outputFormat?: string;
  /** Statistical methods to use */
  methods?: string[];
}

/**
 * Configuration for creative writing scenarios
 */
export interface CreativePromptConfig {
  /** Tone of the content (e.g., "professional", "casual", "technical") */
  tone?: string;
  /** Writing style or voice */
  style?: string;
  /** Target audience */
  audience?: string;
  /** Content format (e.g., "blog post", "email", "tweet") */
  format?: string;
  /** Length constraints */
  length?: string;
}

/**
 * Configuration for customer support scenarios
 */
export interface SupportPromptConfig {
  /** Product or service name */
  product?: string;
  /** Product documentation URL or content */
  documentation?: string;
  /** Common issues or FAQs */
  commonIssues?: string[];
  /** Escalation procedures */
  escalationRules?: string;
  /** Tone and approach */
  tone?: "friendly" | "professional" | "technical";
}

/**
 * Configuration for planning/project management scenarios
 */
export interface PlanningPromptConfig {
  /** Project type or domain */
  projectType?: string;
  /** Timeline constraints */
  timeline?: string;
  /** Team size and roles */
  team?: string;
  /** Budget or resource constraints */
  constraints?: string[];
  /** Methodology (e.g., "agile", "waterfall") */
  methodology?: string;
}

/**
 * Configuration for teaching/educational scenarios
 */
export interface TeachingPromptConfig {
  /** Subject or topic */
  subject?: string;
  /** Student level (e.g., "beginner", "intermediate", "advanced") */
  studentLevel?: string;
  /** Learning style preference */
  learningStyle?: "visual" | "hands-on" | "theoretical";
  /** Teaching approach */
  approach?: "socratic" | "direct" | "exploratory";
}
