/* agent-frontmatter:start
AGENT: Scenario prompts unit tests
PURPOSE: Test all scenario-specific prompt factories (developer, research, analysis, etc.)
USAGE: Run with vitest: bun test scenarios.test.ts
FEATURES:
  - Tests all 7 scenarios
  - Validates scenario-specific parameters
  - Tests default values
  - Tests custom configuration
  - Validates XML formatting in output
SEARCHABLE: test, scenarios, developer, research, analysis, creative, support, planning, teaching
agent-frontmatter:end */

import { describe, expect, it } from "vitest";
import { createAnalysisPrompt } from "../analysis";
import { createCreativePrompt } from "../creative";
import { createDeveloperPrompt } from "../developer";
import { createPlanningPrompt } from "../planning";
import { createResearchPrompt } from "../research";
import { createSupportPrompt } from "../support";
import { createTeachingPrompt } from "../teaching";

describe("Scenario Prompts", () => {
  describe("createDeveloperPrompt", () => {
    it("should generate developer prompt with defaults", () => {
      const prompt = createDeveloperPrompt({});

      expect(prompt).toContain("software development");
      expect(prompt).toContain("Node.js 20");
      expect(prompt).toContain("JavaScript, TypeScript");
      expect(prompt).toContain("<capabilities>");
      expect(prompt).toContain("<steps>");
    });

    it("should include custom runtime", () => {
      const prompt = createDeveloperPrompt({
        runtime: "Python 3.11",
      });

      expect(prompt).toContain("Python 3.11");
    });

    it("should include custom languages", () => {
      const prompt = createDeveloperPrompt({
        languages: ["TypeScript"],
      });

      expect(prompt).toContain("TypeScript");
    });

    it("should include frameworks", () => {
      const prompt = createDeveloperPrompt({
        frameworks: ["React", "Express"],
      });

      expect(prompt).toContain("React");
      expect(prompt).toContain("Express");
    });

    it("should include project context", () => {
      const prompt = createDeveloperPrompt({
        projectContext: "Building a SaaS platform",
      });

      expect(prompt).toContain("## PROJECT CONTEXT");
      expect(prompt).toContain("Building a SaaS platform");
    });

    it("should combine all parameters", () => {
      const prompt = createDeveloperPrompt({
        runtime: "Node.js 20",
        languages: ["TypeScript"],
        frameworks: ["Next.js", "Prisma", "PostgreSQL"],
        projectContext: "E-commerce platform",
      });

      expect(prompt).toContain("Node.js 20");
      expect(prompt).toContain("TypeScript");
      expect(prompt).toContain("Next.js");
      expect(prompt).toContain("Prisma");
      expect(prompt).toContain("PostgreSQL");
      expect(prompt).toContain("E-commerce platform");
    });
  });

  describe("createResearchPrompt", () => {
    it("should generate research prompt with defaults", () => {
      const prompt = createResearchPrompt({});

      expect(prompt).toContain("research and analysis");
      expect(prompt).toContain("detailed");
    });

    it("should include custom domain", () => {
      const prompt = createResearchPrompt({
        domain: "artificial intelligence",
      });

      expect(prompt).toContain("artificial intelligence");
      expect(prompt).toContain("Domain: artificial intelligence");
    });

    it("should handle depth levels", () => {
      const quick = createResearchPrompt({
        domain: "testing",
        depth: "quick",
      });
      expect(quick).toContain("quick");
      expect(quick).toContain("concise summaries");

      const detailed = createResearchPrompt({
        domain: "testing",
        depth: "detailed",
      });
      expect(detailed).toContain("detailed");
      expect(detailed).toContain("thorough explanations");

      const comprehensive = createResearchPrompt({
        domain: "testing",
        depth: "comprehensive",
      });
      expect(comprehensive).toContain("comprehensive");
      expect(comprehensive).toContain("deep, nuanced understanding");
    });

    it("should include source preferences", () => {
      const prompt = createResearchPrompt({
        sources: ["academic papers", "tech blogs"],
      });

      expect(prompt).toContain("## SOURCE PREFERENCES");
      expect(prompt).toContain("academic papers");
      expect(prompt).toContain("tech blogs");
    });

    it("should include time period", () => {
      const prompt = createResearchPrompt({
        timePeriod: "2020-2024",
      });

      expect(prompt).toContain("## TIME FOCUS");
      expect(prompt).toContain("2020-2024");
    });

    it("should combine all parameters", () => {
      const prompt = createResearchPrompt({
        domain: "machine learning",
        depth: "comprehensive",
        sources: ["papers", "arxiv"],
        timePeriod: "2023-2024",
      });

      expect(prompt).toContain("machine learning");
      expect(prompt).toContain("comprehensive");
      expect(prompt).toContain("papers");
      expect(prompt).toContain("arxiv");
      expect(prompt).toContain("2023-2024");
    });
  });

  describe("createAnalysisPrompt", () => {
    it("should generate analysis prompt with data type", () => {
      const prompt = createAnalysisPrompt({
        dataType: "CSV sales data",
      });

      expect(prompt).toContain("data analysis");
      expect(prompt).toContain("CSV sales data");
    });

    it("should include analysis goals", () => {
      const prompt = createAnalysisPrompt({
        goals: ["Find trends", "Predict revenue"],
      });

      expect(prompt).toContain("Find trends");
      expect(prompt).toContain("Predict revenue");
    });

    it("should include output format", () => {
      const prompt = createAnalysisPrompt({
        outputFormat: "Markdown report with charts",
      });

      expect(prompt).toContain("Markdown report with charts");
    });

    it("should include statistical methods", () => {
      const prompt = createAnalysisPrompt({
        methods: ["time series", "regression"],
      });

      expect(prompt).toContain("time series");
      expect(prompt).toContain("regression");
    });
  });

  describe("createCreativePrompt", () => {
    it("should generate creative prompt with tone", () => {
      const prompt = createCreativePrompt({
        tone: "professional but friendly",
      });

      expect(prompt).toContain("professional but friendly");
    });

    it("should include audience", () => {
      const prompt = createCreativePrompt({
        audience: "technical developers",
      });

      expect(prompt).toContain("technical developers");
    });

    it("should include format", () => {
      const prompt = createCreativePrompt({
        format: "blog post",
      });

      expect(prompt).toContain("blog post");
    });

    it("should include length constraint", () => {
      const prompt = createCreativePrompt({
        length: "1000-1500 words",
      });

      expect(prompt).toContain("1000-1500 words");
    });
  });

  describe("createSupportPrompt", () => {
    it("should generate support prompt with product", () => {
      const prompt = createSupportPrompt({
        product: "MyApp",
      });

      expect(prompt).toContain("MyApp");
    });

    it("should include documentation URL", () => {
      const prompt = createSupportPrompt({
        documentation: "https://docs.example.com",
      });

      expect(prompt).toContain("https://docs.example.com");
    });

    it("should include common issues", () => {
      const prompt = createSupportPrompt({
        commonIssues: ["login problems", "payment errors"],
      });

      expect(prompt).toContain("login problems");
      expect(prompt).toContain("payment errors");
    });

    it("should handle friendly tone", () => {
      const prompt = createSupportPrompt({
        tone: "friendly",
      });

      expect(prompt).toContain("friendly");
      expect(prompt).toContain("Warm, approachable");
    });
  });

  describe("createPlanningPrompt", () => {
    it("should generate planning prompt with project type", () => {
      const prompt = createPlanningPrompt({
        projectType: "SaaS application",
      });

      expect(prompt).toContain("SaaS application");
    });

    it("should include timeline", () => {
      const prompt = createPlanningPrompt({
        timeline: "6 months",
      });

      expect(prompt).toContain("6 months");
    });

    it("should include team composition", () => {
      const prompt = createPlanningPrompt({
        team: "5 developers, 2 designers",
      });

      expect(prompt).toContain("5 developers, 2 designers");
    });

    it("should include constraints", () => {
      const prompt = createPlanningPrompt({
        constraints: ["Limited budget", "API dependencies"],
      });

      expect(prompt).toContain("Limited budget");
      expect(prompt).toContain("API dependencies");
    });
  });

  describe("createTeachingPrompt", () => {
    it("should generate teaching prompt with subject", () => {
      const prompt = createTeachingPrompt({
        subject: "React hooks",
      });

      expect(prompt).toContain("React hooks");
    });

    it("should include student level", () => {
      const prompt = createTeachingPrompt({
        studentLevel: "beginner",
      });

      expect(prompt).toContain("beginner");
    });

    it("should include learning style", () => {
      const prompt = createTeachingPrompt({
        learningStyle: "hands-on",
      });

      expect(prompt).toContain("hands-on");
      expect(prompt).toContain("practical exercises");
    });

    it("should handle socratic approach", () => {
      const prompt = createTeachingPrompt({
        approach: "socratic",
      });

      expect(prompt).toContain("Socratic questioning");
      expect(prompt).toContain("discover answers themselves");
    });
  });

  describe("All scenarios follow AGENTS.md format", () => {
    const scenarios = [
      { name: "developer", factory: createDeveloperPrompt, config: {} },
      { name: "research", factory: createResearchPrompt, config: {} },
      {
        name: "analysis",
        factory: createAnalysisPrompt,
        config: { dataType: "test" },
      },
      { name: "creative", factory: createCreativePrompt, config: {} },
      { name: "support", factory: createSupportPrompt, config: {} },
      { name: "planning", factory: createPlanningPrompt, config: {} },
      { name: "teaching", factory: createTeachingPrompt, config: {} },
    ];

    scenarios.forEach(({ name, factory, config }) => {
      it(`${name} prompt should have role definition`, () => {
        const prompt = factory(config);
        expect(prompt).toMatch(/You are a/);
      });

      it(`${name} prompt should have capabilities in XML`, () => {
        const prompt = factory(config);
        expect(prompt).toContain("<capabilities>");
        expect(prompt).toContain("</capabilities>");
      });

      it(`${name} prompt should have responsibilities in XML`, () => {
        const prompt = factory(config);
        expect(prompt).toContain("<responsibilities>");
        expect(prompt).toContain("</responsibilities>");
      });

      it(`${name} prompt should have format requirements in XML`, () => {
        const prompt = factory(config);
        expect(prompt).toContain("<format>");
        expect(prompt).toContain("</format>");
      });

      it(`${name} prompt should end with IMPORTANT`, () => {
        const prompt = factory(config);
        expect(prompt).toContain("## IMPORTANT");
      });
    });
  });
});
