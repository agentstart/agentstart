/* agent-frontmatter:start
AGENT: Unified prompt creation API
PURPOSE: Single entry point for all prompts with smart defaults and auto-detection
USAGE: import { createAgentPrompt } from 'agentstart/prompts'
FEATURES:
  - Single function for all scenarios
  - Natural language scenario detection
  - Smart defaults with zero configuration
  - Runtime auto-detection for developer scenarios
  - Chainable configuration
EXPORTS: createAgentPrompt
agent-frontmatter:end */

import { createAnalysisPrompt } from "./analysis";
import { createCreativePrompt } from "./creative";
import { createDeveloperPrompt } from "./developer";
import { createPlanningPrompt } from "./planning";
import { createResearchPrompt } from "./research";
import { createSupportPrompt } from "./support";
import { createTeachingPrompt } from "./teaching";

export type Scenario =
  | "developer"
  | "research"
  | "analysis"
  | "creative"
  | "support"
  | "planning"
  | "teaching";

export interface MinimalPromptConfig {
  /** Focus area or domain (e.g., "React", "data science", "content marketing") */
  focus?: string;
  /** Additional constraints or requirements */
  constraints?: string[];
}

export interface UnifiedPromptConfig extends MinimalPromptConfig {
  /** Explicit scenario selection */
  scenario?: Scenario;
  /** For code-related scenarios */
  runtime?: string;
  languages?: string[];
  frameworks?: string[];
  /** For research scenarios */
  domain?: string;
  depth?: "quick" | "detailed" | "comprehensive";
  sources?: string[];
  /** For analysis scenarios */
  dataType?: string;
  goals?: string[];
  outputFormat?: string;
  methods?: string[];
  /** For creative scenarios */
  tone?: string;
  style?: string;
  audience?: string;
  format?: string;
  length?: string;
  /** For support scenarios */
  product?: string;
  documentation?: string;
  commonIssues?: string[];
  escalationRules?: string;
  /** For teaching scenarios */
  subject?: string;
  studentLevel?: string;
  learningStyle?: string;
  approach?: string;
  /** For planning scenarios */
  projectType?: string;
  timeline?: string;
  team?: string;
  methodology?: string;
  /** Custom sections to add */
  customSections?: Record<string, string>;
}

/**
 * Detects scenario from natural language description
 *
 * @example
 * detectScenario("help me write a React component") // => "developer"
 * detectScenario("Research TypeScript best practices") // => "research"
 * detectScenario("Plan a SaaS launch") // => "planning"
 */
export function detectScenario(input: string): Scenario {
  const text = input.toLowerCase();

  // Check for more specific scenarios first to avoid conflicts

  // Analysis keywords (check first before research and developer)
  // Because "analyze" appears in both analysis and research keywords
  if (
    text.includes("csv") ||
    text.includes("statistics") ||
    text.includes("chart") ||
    text.includes("graph") ||
    (text.includes("data") &&
      (text.includes("analyze") || text.includes("analysis")))
  ) {
    return "analysis";
  }

  // Creative keywords (check before developer because "write" appears in both)
  if (
    text.includes("blog") ||
    text.includes("article") ||
    text.includes("copy") ||
    text.includes("content") ||
    text.includes("marketing") ||
    text.includes("creative")
  ) {
    return "creative";
  }

  // Development keywords
  if (
    text.includes("code") ||
    text.includes("program") ||
    text.includes("debug") ||
    text.includes("implement") ||
    (text.includes("write") &&
      (text.includes("component") ||
        text.includes("function") ||
        text.includes("app"))) ||
    text.includes("component") ||
    text.includes("function") ||
    text.includes("app") ||
    text.includes("bug") ||
    text.includes("error")
  ) {
    return "developer";
  }

  // Research keywords (more specific ones already checked above)
  if (
    text.includes("research") ||
    text.includes("study") ||
    text.includes("investigate") ||
    text.includes("learn about") ||
    text.includes("find information")
  ) {
    return "research";
  }

  // Planning keywords
  if (
    text.includes("plan") ||
    text.includes("project") ||
    text.includes("launch") ||
    text.includes("strategy") ||
    text.includes("roadmap")
  ) {
    return "planning";
  }

  // Teaching keywords
  if (
    text.includes("teach") ||
    text.includes("explain") ||
    text.includes("learn") ||
    text.includes("tutorial") ||
    text.includes("guide")
  ) {
    return "teaching";
  }

  // Support keywords
  if (
    text.includes("help") ||
    text.includes("support") ||
    text.includes("troubleshoot") ||
    text.includes("issue") ||
    text.includes("problem")
  ) {
    return "support";
  }

  // Default fallback
  return "developer";
}

/**
 * Creates intelligent defaults for each scenario
 */
function createScenarioDefaults(
  scenario: Scenario,
  config: UnifiedPromptConfig,
): string {
  switch (scenario) {
    case "developer": {
      return createDeveloperPrompt({
        runtime: config.runtime ?? "Node.js 20",
        languages: config.languages ?? ["JavaScript", "TypeScript"],
        frameworks: config.frameworks ?? [],
        projectContext: config.focus,
        customSections: config.customSections,
      });
    }

    case "research": {
      return createResearchPrompt({
        domain: config.domain ?? config.focus ?? "general topics",
        depth: config.depth ?? "detailed",
        sources: config.sources,
      });
    }

    case "analysis": {
      return createAnalysisPrompt({
        dataType: config.focus ?? "general data",
        goals: config.constraints,
      });
    }

    case "creative": {
      return createCreativePrompt({
        tone: config.tone ?? "professional",
        audience: config.audience ?? config.focus,
        format: config.format,
      });
    }

    case "support": {
      return createSupportPrompt({
        product: config.product ?? config.focus ?? "our product",
        documentation: config.documentation,
      });
    }

    case "planning": {
      return createPlanningPrompt({
        projectType: config.focus ?? "projects",
        constraints: config.constraints,
      });
    }

    case "teaching": {
      return createTeachingPrompt({
        subject: config.focus ?? "general topics",
      });
    }

    default: {
      return createDeveloperPrompt({});
    }
  }
}

/**
 * Parse natural language to extract configuration
 */
function parseNaturalLanguage(input: string): UnifiedPromptConfig {
  const config: UnifiedPromptConfig = {};

  // Extract technology stack
  const techStackMatch = input.match(
    /\b(Node\.js|Python|React|Vue|Angular|Next\.js|Express|TypeScript|JavaScript|Go|Rust|Django|Flask|PostgreSQL)\b/gi,
  );
  if (techStackMatch) {
    const uniqueTech = [...new Set(techStackMatch.map((t) => t.toLowerCase()))];
    config.languages = uniqueTech.filter(
      (t) =>
        t.includes("javascript") ||
        t.includes("typescript") ||
        t.includes("python") ||
        t.includes("go") ||
        t.includes("rust"),
    );
    config.frameworks = uniqueTech.filter(
      (t) =>
        t.includes("react") ||
        t.includes("vue") ||
        t.includes("angular") ||
        t.includes("next") ||
        t.includes("express") ||
        t.includes("django") ||
        t.includes("flask") ||
        t.includes("postgresql"),
    );
  }

  // Extract domain/focus
  const domainKeywords = [
    "AI",
    "artificial intelligence",
    "machine learning",
    "data science",
    "web development",
    "mobile",
    "backend",
    "frontend",
    "database",
    "marketing",
    "sales",
    "finance",
  ];
  for (const keyword of domainKeywords) {
    if (input.toLowerCase().includes(keyword.toLowerCase())) {
      config.focus = keyword;
      break;
    }
  }

  // Extract depth
  if (input.includes("quick") || input.includes("brief")) {
    config.depth = "quick";
  } else if (input.includes("comprehensive") || input.includes("detailed")) {
    config.depth = "comprehensive";
  }

  return config;
}

/**
 * Create a prompt for an agent with minimal configuration
 *
 * @example
 * ```typescript
 * // Method 1: Zero config - auto-detect
 * const prompt1 = createAgentPrompt();
 *
 * // Method 2: Just tell it what you want (natural language)
 * const prompt2 = createAgentPrompt("help me write a React component");
 * // Auto-detects "developer" scenario, extracts "React"
 *
 * // Method 3: Minimal config with focus
 * const prompt3 = createAgentPrompt({ focus: "TypeScript" });
 * // Defaults to developer scenario
 *
 * // Method 4: Explicit scenario
 * const prompt4 = createAgentPrompt({
 *   scenario: "research",
 *   domain: "artificial intelligence"
 * });
 *
 * // Method 5: Full configuration
 * const prompt5 = createAgentPrompt({
 *   scenario: "developer",
 *   focus: "Next.js full-stack",
 *   runtime: "Node.js 20",
 *   frameworks: ["Next.js", "Prisma"]
 * });
 * ```
 */
export function createAgentPrompt(
  input?: string | UnifiedPromptConfig,
): string {
  // Case 1: No input - default to developer with auto-detection
  if (!input) {
    return createDeveloperPrompt({});
  }

  // Case 2: String input - natural language
  if (typeof input === "string") {
    const scenario = detectScenario(input);
    const parsedConfig = parseNaturalLanguage(input);
    return createScenarioDefaults(scenario, parsedConfig);
  }

  // Case 3: Object input
  const config = input as UnifiedPromptConfig;

  // If scenario is not specified, detect it from focus or other hints
  if (!config.scenario) {
    if (config.focus) {
      config.scenario = detectScenario(config.focus);
    } else if (config.domain) {
      config.scenario = "research";
    } else if (config.runtime || config.languages || config.frameworks) {
      config.scenario = "developer";
    } else if (config.dataType || config.goals) {
      config.scenario = "analysis";
    } else if (config.tone || config.audience) {
      config.scenario = "creative";
    } else {
      config.scenario = "developer";
    }
  }

  return createScenarioDefaults(config.scenario, config);
}

/**
 * Fluent API for building prompts
 *
 * @example
 * ```typescript
 * const prompt = builder()
 *   .scenario("developer")
 *   .focus("Next.js full-stack")
 *   .framework("Next.js")
 *   .framework("Prisma")
 *   .build();
 * ```
 */
export function builder() {
  const config: UnifiedPromptConfig = {};

  return {
    scenario(scenario: Scenario) {
      config.scenario = scenario;
      return this;
    },

    focus(focus: string) {
      config.focus = focus;
      return this;
    },

    constraint(constraint: string) {
      config.constraints = [...(config.constraints ?? []), constraint];
      return this;
    },

    runtime(runtime: string) {
      config.runtime = runtime;
      return this;
    },

    language(lang: string) {
      config.languages = [...(config.languages ?? []), lang];
      return this;
    },

    framework(fw: string) {
      config.frameworks = [...(config.frameworks ?? []), fw];
      return this;
    },

    domain(domain: string) {
      config.domain = domain;
      return this;
    },

    depth(depth: "quick" | "detailed" | "comprehensive") {
      config.depth = depth;
      return this;
    },

    tone(tone: string) {
      config.tone = tone;
      return this;
    },

    audience(audience: string) {
      config.audience = audience;
      return this;
    },

    format(format: string) {
      config.format = format;
      return this;
    },

    custom(title: string, content: string) {
      config.customSections = {
        ...(config.customSections ?? {}),
        [title]: content,
      };
      return this;
    },

    build(): string {
      return createAgentPrompt(config);
    },
  };
}
