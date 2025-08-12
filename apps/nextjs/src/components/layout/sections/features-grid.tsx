"use client";

import { Card } from "@/components/ui/card";
import {
  Brain,
  Code2,
  Sparkles,
  Zap,
  Shield,
  GitBranch,
  Database,
  Palette,
  Terminal,
} from "lucide-react";

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
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Large Feature - AI First */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative col-span-1 overflow-hidden p-8 transition-all sm:col-span-2 lg:col-span-2">
              <div className="relative z-10">
                <div className="bg-primary/10 text-primary mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                  <Brain className="h-6 w-6" />
                </div>

                <h3 className="mb-2 text-2xl font-bold">
                  AI-First Architecture
                </h3>
                <p className="text-muted-foreground">
                  AGENT.md driven development with clear conventions. Every
                  decision optimized for AI comprehension and token efficiency.
                  True vibe coding that actually works.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                    AGENT.md
                  </span>
                  <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                    Token Efficient
                  </span>
                  <span className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-xs font-medium">
                    Convention Driven
                  </span>
                </div>
              </div>
            </Card>

            {/* TypeScript Ready */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Code2 className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Full TypeScript</h3>
                <p className="text-muted-foreground text-sm">
                  End-to-end type safety with tRPC, Zod validation, and typed
                  database queries.
                </p>
              </div>
            </Card>

            {/* Auth */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
                  <Shield className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Auth Built-in</h3>
                <p className="text-muted-foreground text-sm">
                  Better Auth with OAuth, magic links, and session management
                  ready to go.
                </p>
              </div>
            </Card>

            {/* Database */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <Database className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Database Ready</h3>
                <p className="text-muted-foreground text-sm">
                  Drizzle ORM with migrations, seeds, and visual studio for data
                  management.
                </p>
              </div>
            </Card>

            {/* Payments */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                  <Zap className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Stripe Payments</h3>
                <p className="text-muted-foreground text-sm">
                  Subscription management, webhooks, and customer portal
                  pre-configured.
                </p>
              </div>
            </Card>

            {/* Large Feature - Performance */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative col-span-1 overflow-hidden p-8 transition-all sm:col-span-2">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:gap-8">
                <div className="flex-1">
                  <div className="bg-primary/10 text-primary mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                    <Sparkles className="h-6 w-6" />
                  </div>

                  <h3 className="mb-2 text-2xl font-bold">
                    Smart Error Handling
                  </h3>
                  <p className="text-muted-foreground">
                    Intelligent error messages with auto-fix commands. AI agents
                    can self-diagnose and resolve issues without human
                    intervention.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2 text-sm sm:mt-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="text-muted-foreground h-4 w-4" />
                    <code className="bg-muted rounded px-2 py-1 text-xs">
                      bun db:push
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Terminal className="text-muted-foreground h-4 w-4" />
                    <code className="bg-muted rounded px-2 py-1 text-xs">
                      bun fix
                    </code>
                  </div>
                </div>
              </div>
            </Card>

            {/* Monorepo */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                  <GitBranch className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Monorepo Setup</h3>
                <p className="text-muted-foreground text-sm">
                  Turborepo with shared packages for auth, db, and API. Scale
                  effortlessly.
                </p>
              </div>
            </Card>

            {/* UI Components */}
            <Card className="group border-border/40 bg-card hover:border-primary/40 relative overflow-hidden p-6 transition-all">
              <div className="relative z-10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
                  <Palette className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-lg font-semibold">Beautiful UI</h3>
                <p className="text-muted-foreground text-sm">
                  Shadcn/ui components with dark mode, animations, and
                  responsive design.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
