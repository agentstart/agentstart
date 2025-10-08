/* agent-frontmatter:start
AGENT: Footer section component with i18n support
PURPOSE: Site footer with links, resources, and branding
USAGE: <FooterSection /> - typically at page bottom
FEATURES:
  - Multi-column link layout
  - Animated background effects
  - Social links
  - Copyright notice
  - i18n support using next-intl
SEARCHABLE: footer section, site footer, footer links
agent-frontmatter:end */

"use client";

import Link from "next/link";
import { siteConfig } from "@acme/config";
import { CssDotMatrixText } from "@/components/magicui/css-dot-matrix-text";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { useTheme } from "next-themes";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/controls/theme-switch";
import { useTranslations } from "next-intl";

export const FooterSection = () => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("sections.footer");

  return (
    <footer className="relative border-t">
      {/* Links Section */}
      <div className="container pt-12">
        <div className="grid gap-8 px-8 sm:grid-cols-1 lg:grid-cols-5">
          {/* Logo and Description */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-2">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Logo />
                <span className="text-lg font-semibold">{siteConfig.name}</span>
              </div>
              <p className="text-muted-foreground text-sm">{t("tagline")}</p>
            </div>

            <div>
              <ThemeSwitch />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="mb-4 font-semibold">{t("product.title")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("product.features")}
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("product.pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="#showcase"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("product.showcase")}
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("product.changelog")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 font-semibold">{t("resources.title")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("resources.docs")}
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("resources.blog")}
                </Link>
              </li>
              <li>
                <Link
                  href="/guides"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("resources.guides")}
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("resources.support")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 font-semibold">{t("company.title")}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("company.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("company.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t("company.terms")}
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  GitHub
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative z-0 mt-8 flex h-48 w-full items-center justify-center text-center md:h-64">
          <FlickeringGrid
            className="absolute inset-0 z-0 size-full mask-t-from-50% mask-radial-[50%_90%] mask-radial-from-80%"
            squareSize={2}
            gridGap={4}
            maxOpacity={0.1}
            flickerChance={0.1}
            color={
              resolvedTheme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)"
            }
          />
          <CssDotMatrixText className="text-6xl font-bold tracking-tighter md:text-8xl">
            {siteConfig.name}
          </CssDotMatrixText>
        </div>
      </div>
    </footer>
  );
};
