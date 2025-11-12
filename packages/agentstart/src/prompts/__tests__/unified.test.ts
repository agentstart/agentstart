/* agent-frontmatter:start
AGENT: Unified API unit tests
PURPOSE: Test createAgentPrompt, detectScenario, and builder functionality
USAGE: Run with vitest: bun test unified.test.ts
FEATURES:
  - Tests zero config
  - Tests natural language detection
  - Tests unified config object
  - Tests builder fluent API
  - Tests scenario auto-detection
  - Tests tech stack extraction
SEARCHABLE: test, unified API, createAgentPrompt, builder, scenario detection
agent-frontmatter:end */

import { describe, expect, it } from "vitest";
import { builder, createAgentPrompt, detectScenario } from "../unified";

describe("createAgentPrompt", () => {
  describe("zero config", () => {
    it("should work with no parameters", () => {
      const result = createAgentPrompt();

      expect(result).toContain("You are");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(100);
    });

    it("should have developer defaults when no config", () => {
      const result = createAgentPrompt();

      expect(result).toContain("software development");
    });
  });

  describe("natural language input", () => {
    it("should detect developer scenario from code keywords", () => {
      const result = createAgentPrompt("Help me write a React component");

      expect(result).toContain("software development");
      expect(result.toLowerCase()).toContain("react");
    });

    it("should detect research scenario from research keywords", () => {
      const result = createAgentPrompt(
        "Research best practices for state management",
      );

      expect(result).toContain("research and analysis");
    });

    it("should detect analysis scenario from data keywords", () => {
      const result = createAgentPrompt("Analyze this CSV data");

      expect(result).toContain("data analysis");
    });

    it("should detect creative scenario from writing keywords", () => {
      const result = createAgentPrompt("Write a blog post about React hooks");

      expect(result).toContain("creative writing");
    });

    it("should detect planning scenario from planning keywords", () => {
      const result = createAgentPrompt("Plan a SaaS product launch");

      expect(result).toContain("planning");
    });

    it("should detect teaching scenario from teaching keywords", () => {
      const result = createAgentPrompt("Explain how React hooks work");

      expect(result).toContain("teaching");
    });

    it("should detect support scenario from support keywords", () => {
      const result = createAgentPrompt("Help me configure authentication");

      expect(result).toContain("support");
    });

    it("should extract technology stack from natural language", () => {
      const result = createAgentPrompt(
        "How do I implement this in Next.js with TypeScript",
      );

      expect(result.toLowerCase()).toContain("next.js");
      expect(result.toLowerCase()).toContain("typescript");
    });

    it("should extract multiple frameworks", () => {
      const result = createAgentPrompt(
        "Build with React, Express, and PostgreSQL",
      );

      expect(result.toLowerCase()).toContain("react");
      expect(result.toLowerCase()).toContain("express");
      expect(result.toLowerCase()).toContain("postgresql");
    });
  });

  describe("config object", () => {
    it("should accept minimal config with just scenario", () => {
      const result = createAgentPrompt({ scenario: "developer" });

      expect(result).toContain("software development");
    });

    it("should accept config with focus", () => {
      const result = createAgentPrompt({
        scenario: "developer",
        focus: "SaaS application",
      });

      expect(result).toContain("SaaS application");
    });

    it("should accept full developer config", () => {
      const result = createAgentPrompt({
        scenario: "developer",
        focus: "Full-stack app",
        runtime: "Node.js 20",
        languages: ["TypeScript"],
        frameworks: ["Next.js", "Prisma"],
      });

      expect(result).toContain("Node.js 20");
      expect(result.toLowerCase()).toContain("typescript");
      expect(result.toLowerCase()).toContain("next.js");
      expect(result).toContain("Prisma");
      expect(result).toContain("Full-stack app");
    });

    it("should accept research config", () => {
      const result = createAgentPrompt({
        scenario: "research",
        domain: "artificial intelligence",
        depth: "comprehensive",
        sources: ["academic papers", "tech blogs"],
      });

      expect(result).toContain("artificial intelligence");
      expect(result).toContain("comprehensive");
      expect(result).toContain("academic papers");
    });

    it("should auto-detect scenario from focus if not provided", () => {
      const result = createAgentPrompt({
        focus: "Build a web app",
        languages: ["TypeScript"],
      });

      expect(result).toContain("software development");
      expect(result.toLowerCase()).toContain("typescript");
    });

    it("should auto-detect scenario from domain for research", () => {
      const result = createAgentPrompt({
        domain: "machine learning",
      });

      expect(result).toContain("research and analysis");
    });

    it("should include custom sections", () => {
      const result = createAgentPrompt({
        scenario: "developer",
        focus: "SaaS",
        runtime: "Node.js 20",
        customSections: {
          DATABASE: "PostgreSQL with Prisma",
          DEPLOYMENT: "Vercel",
        },
      });

      expect(result).toContain("## DATABASE");
      expect(result).toContain("PostgreSQL with Prisma");
      expect(result).toContain("## DEPLOYMENT");
      expect(result).toContain("Vercel");
    });

    it("should handle empty constraints array", () => {
      const result = createAgentPrompt({
        scenario: "developer",
        constraints: [],
      });

      expect(result).toContain("software development");
    });

    it("should include constraints when provided", () => {
      const result = createAgentPrompt({
        scenario: "planning",
        focus: "Product launch",
        constraints: ["Budget limit", "Timeline: 6 months"],
      });

      expect(result).toContain("Budget limit");
    });
  });
});

describe("detectScenario", () => {
  it("should detect developer from code keywords", () => {
    expect(detectScenario("Write a function")).toBe("developer");
    expect(detectScenario("Debug this error")).toBe("developer");
    expect(detectScenario("React component")).toBe("developer");
    expect(detectScenario("App has a bug")).toBe("developer");
  });

  it("should detect research from research keywords", () => {
    expect(detectScenario("Research best practices")).toBe("research");
    expect(detectScenario("Study this topic")).toBe("research");
    expect(detectScenario("Learn about new tech")).toBe("research");
  });

  it("should detect analysis from data keywords", () => {
    expect(detectScenario("Analyze CSV data")).toBe("analysis");
    expect(detectScenario("Chart statistics")).toBe("analysis");
  });

  it("should detect creative from writing keywords", () => {
    expect(detectScenario("Write blog post")).toBe("creative");
    expect(detectScenario("Content for marketing")).toBe("creative");
  });

  it("should detect planning from planning keywords", () => {
    expect(detectScenario("Plan project launch")).toBe("planning");
    expect(detectScenario("Create roadmap")).toBe("planning");
  });

  it("should detect teaching from teaching keywords", () => {
    expect(detectScenario("Explain concepts")).toBe("teaching");
    expect(detectScenario("Tutorial for beginners")).toBe("teaching");
  });

  it("should detect support from support keywords", () => {
    expect(detectScenario("Help with setup")).toBe("support");
    expect(detectScenario("Troubleshoot issue")).toBe("support");
  });

  it("should default to developer for unknown text", () => {
    expect(detectScenario("Random text")).toBe("developer");
  });

  it("should be case insensitive", () => {
    expect(detectScenario("WRITE CODE")).toBe("developer");
    expect(detectScenario("Research AI")).toBe("research");
  });
});

describe("builder", () => {
  it("should create prompt with fluent API", () => {
    const prompt = builder()
      .scenario("developer")
      .focus("SaaS app")
      .runtime("Node.js 20")
      .language("TypeScript")
      .framework("Next.js")
      .framework("Prisma")
      .build();

    expect(prompt).toContain("Node.js 20");
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("Next.js");
    expect(prompt).toContain("Prisma");
    expect(prompt).toContain("SaaS app");
  });

  it("should support custom sections in builder", () => {
    const prompt = builder()
      .scenario("developer")
      .focus("App")
      .custom("DEPLOYMENT", "Vercel")
      .custom("DATABASE", "PostgreSQL")
      .build();

    expect(prompt).toContain("## DEPLOYMENT");
    expect(prompt).toContain("Vercel");
    expect(prompt).toContain("## DATABASE");
    expect(prompt).toContain("PostgreSQL");
  });

  it("should support constraints in builder", () => {
    const prompt = builder()
      .scenario("planning")
      .focus("Product launch")
      .constraint("Budget: $50k")
      .constraint("Timeline: 3 months")
      .build();

    expect(prompt).toContain("Budget: $50k");
    expect(prompt).toContain("Timeline: 3 months");
  });

  it("should handle multiple languages", () => {
    const prompt = builder()
      .scenario("developer")
      .language("TypeScript")
      .language("JavaScript")
      .language("SQL")
      .build();

    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("JavaScript");
    expect(prompt).toContain("SQL");
  });

  it("should handle multiple frameworks", () => {
    const prompt = builder()
      .scenario("developer")
      .framework("React")
      .framework("Express")
      .framework("PostgreSQL")
      .build();

    expect(prompt).toContain("React");
    expect(prompt).toContain("Express");
    expect(prompt).toContain("PostgreSQL");
  });

  it("should build valid prompt with minimal fluent calls", () => {
    const prompt = builder().scenario("developer").build();

    expect(prompt).toContain("software development");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
