"use client";

import React from "react";
import { Brain, Sparkles, Shield, GitBranch } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { cn } from "@/lib/utils";
import { CornerBorders } from "./corner-borders";
import { GridPattern } from "@/components/magicui/grid-pattern";

// Features data
const features = [
  {
    name: "AI-First Architecture",
    description:
      "AGENTS.md driven development with clear conventions. Every decision optimized for AI comprehension and token efficiency.",
    href: "/docs/ai-first",
    cta: "Learn more",
    className:
      "col-span-5 lg:col-span-3 lg:border-r border-t border-l-0 2xl:border-l",
    background: <div />,
    Icon: Brain,
  },
  {
    name: "Production Ready Stack",
    description:
      "Better Auth, Drizzle ORM, Stripe payments - all the essentials pre-configured and integrated. Ready to ship from day one.",
    href: "/docs/stack",
    cta: "Explore stack",
    className: "col-span-5 lg:col-span-2 lg:border-t 2xl:border-r",
    background: <div />,
    Icon: Shield,
  },
  {
    name: "Monorepo Setup",
    description:
      "Turborepo with shared packages for auth, db, and API. Scale effortlessly.",
    href: "/docs/monorepo",
    cta: "Learn",
    className: "col-span-5 lg:col-span-2 lg:border-r 2xl:border-l",
    background: <div />,
    Icon: GitBranch,
  },
  {
    name: "Documentation Driven",
    description:
      "All code includes comprehensive comments ensuring agents understand each file's purpose and usage patterns.",
    href: "/docs/documentation",
    cta: "View docs",
    className: "col-span-5 lg:col-span-3 2xl:border-r",
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
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="relative border-b py-24 sm:pt-32">
      <div className="relative container mx-auto max-w-7xl">
        <CornerBorders position="all" />

        <div className="relative border-t py-16 text-center 2xl:border-x">
          <GridPattern
            className="stroke-gray-400/5"
            width={50}
            height={50}
            x={-1}
            y={-1}
            strokeDasharray={"4 2"}
          />

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything You Need
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Pre-configured with enterprise features, optimized for AI
            development
          </p>
        </div>

        {/* Bento Grid */}
        <BentoGrid className="grid-cols-5 gap-0">
          {features.map((feature) => (
            <BentoCard
              key={feature.name}
              {...feature}
              className={cn(
                "rounded-none border-0 border-b !shadow-none",
                feature.className,
              )}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};
