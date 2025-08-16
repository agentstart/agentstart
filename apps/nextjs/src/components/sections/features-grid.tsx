"use client";

import React from "react";
import {
  Brain,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  Database,
  Palette,
} from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";

// Features data
const features = [
  {
    name: "AI-First Architecture",
    description:
      "AGENT.md driven development with clear conventions. Every decision optimized for AI comprehension and token efficiency.",
    href: "/docs/ai-first",
    cta: "Learn more",
    className: "col-span-3 lg:col-span-2",
    background: <div />,
    Icon: Brain,
  },
  {
    name: "Beautiful UI",
    description:
      "Shadcn/ui components with dark mode, animations, and responsive design.",
    href: "/docs/ui",
    cta: "Preview",
    className: "col-span-3 lg:col-span-1",
    background: <div />,
    Icon: Palette,
  },
  {
    name: "Auth Built-in",
    description:
      "Better Auth with OAuth, magic links, and session management ready to go.",
    href: "/docs/auth",
    cta: "Setup",
    className: "col-span-3 lg:col-span-1",
    background: <div />,
    Icon: Shield,
  },
  {
    name: "Database Ready",
    description:
      "Drizzle ORM with migrations, seeds, and visual studio for data management.",
    href: "/docs/database",
    cta: "Configure",
    className: "col-span-3 lg:col-span-1",
    background: <div />,
    Icon: Database,
  },
  {
    name: "Stripe Payments",
    description:
      "Subscription management, webhooks, and customer portal pre-configured.",
    href: "/docs/payments",
    cta: "Set up",
    className: "col-span-3 lg:col-span-1",
    background: <div />,
    Icon: Zap,
  },
  {
    name: "Documentation Driven",
    description:
      "All code includes comprehensive comments ensuring agents understand each file's purpose and usage patterns.",
    href: "/docs/documentation",
    cta: "View docs",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div>
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 text-sm">
          <div className="bg-accent flex items-center gap-2 rounded px-3 py-1.5 backdrop-blur-sm">
            <code className="text-muted-foreground">// AGENT: Purpose</code>
          </div>
          <div className="bg-accent flex items-center gap-2 rounded px-3 py-1.5 backdrop-blur-sm">
            <code className="text-muted-foreground">// USAGE: Examples</code>
          </div>
        </div>
      </div>
    ),
    Icon: Sparkles,
  },
  {
    name: "Monorepo Setup",
    description:
      "Turborepo with shared packages for auth, db, and API. Scale effortlessly.",
    href: "/docs/monorepo",
    cta: "Learn",
    className: "col-span-3 lg:col-span-1",
    background: <div />,
    Icon: GitBranch,
  },
];

export const FeaturesGrid = () => {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything You Need
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Pre-configured with enterprise features, optimized for AI
            development
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mx-auto max-w-7xl">
          <BentoGrid>
            {features.map((feature) => (
              <BentoCard key={feature.name} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
};
