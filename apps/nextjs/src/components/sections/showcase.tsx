"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Clock, Cpu } from "lucide-react";
import Link from "next/link";

const showcaseItems = [
  {
    title: "Vibe Coding in Action",
    description: "Watch how natural language turns into production-ready code",
    image: "/api/placeholder/600/400",
    tags: ["Live Demo", "AI Agents"],
    stats: {
      time: "2 min",
      tokens: "1.2k",
    },
  },
  {
    title: "From Idea to Deployment",
    description: "Build and deploy a full SaaS app in under 10 minutes",
    image: "/api/placeholder/600/400",
    tags: ["Tutorial", "Full Stack"],
    stats: {
      time: "10 min",
      tokens: "5k",
    },
  },
  {
    title: "Smart Error Resolution",
    description: "See how AI agents self-diagnose and fix issues automatically",
    image: "/api/placeholder/600/400",
    tags: ["Error Handling", "DX"],
    stats: {
      time: "30 sec",
      tokens: "500",
    },
  },
];

export const ShowcaseSection = () => {
  return (
    <section id="showcase" className="relative py-24 sm:py-32 overflow-hidden">

      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge className="mb-4" variant="outline">
            See It In Action
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Real World Examples
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover how developers are shipping faster with Agent Stack
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {showcaseItems.map((item, index) => (
              <Link
                key={index}
                href="#"
                className="group"
              >
                <Card className="overflow-hidden border-border/40 bg-card transition-all hover:border-primary/40 hover:shadow-lg">
                  {/* Image placeholder */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="rounded-full bg-background/90 backdrop-blur-sm p-4 shadow-lg">
                        <ArrowUpRight className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Tags */}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Title & Description */}
                    <h3 className="mb-2 font-semibold text-lg group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
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
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              View all examples
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};