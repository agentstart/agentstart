"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export const HeroSection = () => {
  const { data: session } = authClient.useSession();

  return (
    <section className="relative flex min-h-[90vh] w-full items-center overflow-hidden">
      <div className="container relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center space-y-8 text-center">
            {/* Announcement Badge */}
            <Link
              href="#features"
              className="border-border/40 bg-background/60 hover:border-primary/40 group inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm backdrop-blur-sm transition-all"
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
                className="shadow-primary/25 hover:shadow-primary/30 group h-12 px-8 font-semibold shadow-lg transition-all hover:shadow-xl"
              >
                <Link href={session?.user.id ? "/dashboard" : "/auth/sign-in"}>
                  Start Building
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
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
