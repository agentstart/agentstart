// AGENT: Hero section component for landing page
// PURPOSE: Eye-catching hero section with animated background and CTA buttons
// USAGE: <HeroSection /> - place at top of landing page
// FEATURES:
//   - Animated grid pattern background
//   - Responsive typography
//   - Auth-aware CTAs (different for logged in users)
//   - Corner border decorations
// SEARCHABLE: hero section, landing hero, homepage hero

"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { CornerBorders } from "./corner-borders";

// AGENT: Main hero section export
// CUSTOMIZATION: Modify text, badges, or CTAs as needed
export const HeroSection = () => {
  const { user } = useAuth();

  return (
    <section
      id="hero"
      className="relative flex min-h-[90vh] w-full items-center border-b"
    >
      <AnimatedGridPattern
        className="mask-t-from-50% mask-b-from-50% mask-radial-[50%_90%] mask-radial-from-80% stroke-gray-400/15"
        numSquares={30}
        maxOpacity={0.05}
        duration={3}
      />

      <CornerBorders position="bl" />
      <CornerBorders position="br" />

      <div className="relative z-10 container">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center space-y-8 text-center">
            {/* Announcement Badge */}
            <Link
              href="#features"
              className="border-border/40 bg-background/60 hover:border-primary/40 group inline-flex items-center gap-2 border px-4 py-1.5 text-sm backdrop-blur-sm transition-all"
            >
              <Sparkles className="text-primary h-3.5 w-3.5" />
              <span className="text-muted-foreground">
                Introducing Agent Stack v1.0
              </span>
              <ArrowRight className="text-muted-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                <span className="inline-block">Build with AI</span>
                <br />
                <span className="text-primary inline-block">
                  Ship 10x Faster
                </span>
              </h1>

              <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl">
                The first fullstack template designed for AI agents. Zero
                config, maximum efficiency, true vibe coding.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="shadow-primary/25 hover:shadow-primary/30 group h-12 rounded-none px-8 font-semibold transition-all"
              >
                <Link href={user?.id ? "/dashboard" : "/auth/sign-in"}>
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-none px-8 font-semibold"
                asChild
              >
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="text-muted-foreground flex items-center gap-8 pt-8 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span>Active Development</span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-foreground font-semibold">1,000+</span>
                <span>Developers</span>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-foreground font-semibold">90%</span>
                <span>Less Tokens</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
