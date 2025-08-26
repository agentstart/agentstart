"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export const CTASection = () => {
  const { user } = useAuth();

  return (
    <section id="cta" className="relative overflow-hidden py-24 sm:py-32">
      <div className="relative container">
        <div className="mx-auto max-w-3xl">
          <div className="border-border/40 bg-card rounded-3xl border p-8 text-center shadow-lg sm:p-12">
            {/* Sparkle decoration */}
            <div className="bg-primary/10 mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full">
              <Sparkles className="text-primary h-6 w-6" />
            </div>

            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Ready to Ship <span className="text-primary">10x Faster?</span>
            </h2>

            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
              Join thousands of developers building with AI agents. Start with
              our template and ship your first feature in minutes.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="shadow-primary/25 hover:shadow-primary/30 group h-12 px-8 font-semibold shadow-lg transition-all hover:shadow-xl"
              >
                <Link href={user?.id ? "/dashboard" : "/auth/sign-in"}>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-12 px-8 font-semibold"
              >
                View Documentation
              </Button>
            </div>

            <p className="text-muted-foreground mt-8 text-sm">
              No credit card required • Free forever for individuals
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
