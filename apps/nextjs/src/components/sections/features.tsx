/* agent-frontmatter:start
AGENT: Features grid section using Bento layout with i18n support
PURPOSE: Showcase product features in a visually appealing grid
USAGE: <FeaturesSection /> - typically after hero section
FEATURES:
  - Responsive bento grid layout
  - Interactive hover effects
  - Icon integration with lucide-react
  - Corner border decorations
  - i18n support using next-intl
CUSTOMIZATION: Modify features array to change content
SEARCHABLE: features section, bento grid, product features
agent-frontmatter:end */

"use client";

import React from "react";
import { Brain, Sparkles, Shield, GitBranch } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { cn } from "@/lib/utils";
import { CornerBorders } from "./corner-borders";
import { GridPattern } from "@/components/magicui/grid-pattern";
import { useTranslations } from "next-intl";

export const FeaturesSection = () => {
  const t = useTranslations("sections.features");

  // Features data
  const features = [
    {
      name: t("items.aiFirst.title"),
      description: t("items.aiFirst.description"),
      href: "/docs/ai-first",
      cta: t("items.aiFirst.cta"),
      className:
        "col-span-5 lg:col-span-3 lg:border-r border-t border-l-0 2xl:border-l",
      background: <div />,
      Icon: Brain,
    },
    {
      name: t("items.production.title"),
      description: t("items.production.description"),
      href: "/docs/stack",
      cta: t("items.production.cta"),
      className: "col-span-5 lg:col-span-2 lg:border-t 2xl:border-r",
      background: <div />,
      Icon: Shield,
    },
    {
      name: t("items.monorepo.title"),
      description: t("items.monorepo.description"),
      href: "/docs/monorepo",
      cta: t("items.monorepo.cta"),
      className: "col-span-5 lg:col-span-2 lg:border-r 2xl:border-l",
      background: <div />,
      Icon: GitBranch,
    },
    {
      name: t("items.documentation.title"),
      description: t("items.documentation.description"),
      href: "/docs/documentation",
      cta: t("items.documentation.cta"),
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
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{t("subtitle")}</p>
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
