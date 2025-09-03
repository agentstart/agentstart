// AGENT: Footer section component
// PURPOSE: Site footer with links, resources, and branding
// USAGE: <FooterSection /> - typically at page bottom
// FEATURES:
//   - Multi-column link layout
//   - Animated background effects
//   - Social links
//   - Copyright notice
// SEARCHABLE: footer section, site footer, footer links

"use client";

import Link from "next/link";
import { siteConfig } from "@acme/config";
import { CssDotMatrixText } from "@/components/magicui/css-dot-matrix-text";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { useTheme } from "next-themes";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/controls/theme-switch";

export const FooterSection = () => {
  const { resolvedTheme } = useTheme();

  return (
    <footer className="relative border-t">
      {/* Links Section */}
      <div className="container pt-12">
        <div className="grid gap-8 px-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Logo and Description */}
          <div className="flex flex-col justify-between gap-4">
            <div>
              <div className="mb-4 flex items-center gap-1">
                <Logo />
                <span className="text-lg font-semibold">{siteConfig.name}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                The first fullstack template built for AI agents, not humans.
                Zero config, maximum efficiency, true vibe coding.
              </p>
            </div>

            <div>
              <ThemeSwitch />
            </div>
          </div>

          {/* Features Links */}
          <div>
            <h3 className="mb-4 font-semibold">Features</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AI-First Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Token Efficient
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Smart Errors
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AGENTS.md
                </Link>
              </li>
            </ul>
          </div>

          {/* Built-in */}
          <div>
            <h3 className="mb-4 font-semibold">Built-in</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Authentication
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Payments
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Database
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  AI SDK
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="mb-4 font-semibold">Resources</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="https://github.com"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/examples"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Examples
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Blog
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
