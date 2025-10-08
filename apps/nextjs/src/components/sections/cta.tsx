/* agent-frontmatter:start
AGENT: Call-to-action section component
PURPOSE: Conversion-focused section with prominent action buttons
USAGE: <CTASection /> - typically near page bottom
FEATURES:
  - Auth-aware CTAs (different for logged in users)
  - Corner border decorations
  - Responsive design
  - i18n support
SEARCHABLE: cta section, call to action, conversion section
agent-frontmatter:end */

"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CornerBorders } from "./corner-borders";

export const CTASection = () => {
  const { user } = useAuth();
  const t = useTranslations("sections.cta");

  return (
    <section id="cta" className="relative py-24 sm:py-32">
      <CornerBorders position="all" />

      <div className="container px-4">
        <div className="mx-auto max-w-3xl">
          <div className="border border-border/40 bg-card p-8 text-center sm:p-12">
            {/* Sparkle decoration */}
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>

            <h2 className="mb-4 font-bold text-3xl sm:text-4xl">
              {t("title")}{" "}
              <span className="text-primary">{t("titleHighlight")}</span>
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              {t("description")}
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-none px-8 font-semibold shadow-primary/25 transition-all hover:shadow-primary/30"
              >
                <Link href={user?.id ? "/dashboard" : "/auth/sign-in"}>
                  {t("getStarted")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-none px-8 font-semibold"
                asChild
              >
                <Link href="/docs">{t("viewDocs")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
