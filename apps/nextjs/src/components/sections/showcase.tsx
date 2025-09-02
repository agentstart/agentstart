"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Clock, Cpu } from "lucide-react";
import Link from "next/link";
import { CornerBorders } from "./corner-borders";

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
    <section id="showcase" className="relative border-b py-24 sm:py-32">
      <CornerBorders position="all" />

      <div className="container px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <Badge className="mb-4" variant="outline">
            See It In Action
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Real World Examples
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Discover how developers are shipping faster with Agent Stack
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {showcaseItems.map((item, index) => (
              <Link key={index} href="#" className="group">
                <Card className="rounded-none py-0 shadow-none">
                  {/* Image placeholder */}
                  <div className="bg-muted relative aspect-video overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="bg-background/90 rounded-full p-4 shadow-lg backdrop-blur-sm">
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
                    <h3 className="group-hover:text-primary mb-2 text-lg font-semibold transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {item.description}
                    </p>

                    {/* Stats */}
                    <div className="text-muted-foreground mt-4 flex items-center gap-4 text-xs">
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
              className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
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
