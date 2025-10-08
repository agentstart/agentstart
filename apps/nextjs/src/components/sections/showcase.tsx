/* agent-frontmatter:start
AGENT: Showcase section component with i18n support
PURPOSE: Display featured demos, tutorials, or case studies
USAGE: <ShowcaseSection /> - typically on landing page
FEATURES:
  - Card-based showcase items
  - Tags and stats display
  - Corner border decorations
  - i18n support using next-intl
CUSTOMIZATION: Modify showcaseItems array for content
SEARCHABLE: showcase section, demo section, case studies
agent-frontmatter:end */

"use client";

import { ArrowUpRight, Clock, Cpu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CornerBorders } from "./corner-borders";

export const ShowcaseSection = () => {
  const t = useTranslations("sections.showcase");

  const showcaseItems = [
    {
      title: t("items.vibeCoding.title"),
      description: t("items.vibeCoding.description"),
      image: "/api/placeholder/600/400",
      tags: [t("items.vibeCoding.tags.0"), t("items.vibeCoding.tags.1")],
      stats: {
        time: "2 min",
        tokens: "1.2k",
      },
    },
    {
      title: t("items.ideaToDeployment.title"),
      description: t("items.ideaToDeployment.description"),
      image: "/api/placeholder/600/400",
      tags: [
        t("items.ideaToDeployment.tags.0"),
        t("items.ideaToDeployment.tags.1"),
      ],
      stats: {
        time: "10 min",
        tokens: "5k",
      },
    },
    {
      title: t("items.errorResolution.title"),
      description: t("items.errorResolution.description"),
      image: "/api/placeholder/600/400",
      tags: [
        t("items.errorResolution.tags.0"),
        t("items.errorResolution.tags.1"),
      ],
      stats: {
        time: "30 sec",
        tokens: "500",
      },
    },
  ];
  return (
    <section id="showcase" className="relative border-b py-24 sm:py-32">
      <CornerBorders position="all" />

      <div className="container px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge className="mb-4" variant="outline">
            {t("badge")}
          </Badge>
          <h2 className="font-bold text-3xl tracking-tight sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {showcaseItems.map((item) => (
              <Link key={item.title} href="#" className="group">
                <Card className="rounded-none py-0 shadow-none">
                  {/* Image placeholder */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="rounded-full bg-background/90 p-4 shadow-lg backdrop-blur-sm">
                        <ArrowUpRight className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Tags */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Title & Description */}
                    <h3 className="mb-2 font-semibold text-lg transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="line-clamp-2 text-muted-foreground text-sm">
                      {item.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.stats.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        <span>{item.stats.tokens} tokens</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* View all link */}
          <div className="mt-12 text-center">
            <Link
              href="#"
              className="inline-flex items-center gap-2 font-medium text-primary text-sm hover:underline"
            >
              {t("viewAll")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
