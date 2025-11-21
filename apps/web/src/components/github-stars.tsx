"use client";

import { StarIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Group, GroupSeparator } from "@/components/ui/group";
import { cn } from "@/lib/utils";

interface GitHubStarsProps {
  className?: string;
  text?: string;
}

export function GitHubStars({ className, text }: GitHubStarsProps) {
  const [stars, setStars] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/agentstart/agentstart")
      .then((res) => res.json())
      .then((data: any) => {
        if (data.stargazers_count) {
          setStars(
            new Intl.NumberFormat("en-US", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(data.stargazers_count),
          );
        }
      })
      .catch((err) => console.error("Failed to fetch stars", err));
  }, []);

  return (
    <Link
      className={cn(
        "flex items-center gap-1 text-muted-foreground text-sm",
        className,
      )}
      href="https://github.com/agentstart/agentstart"
      target="_blank"
    >
      <Group>
        <Button variant="outline" size="sm">
          <StarIcon weight="fill" className="size-4 text-yellow-500" />
          <span>{text ?? "Star"}</span>
        </Button>
        <GroupSeparator />
        <Button variant="outline" size="sm">
          <span>{stars}</span>
        </Button>
      </Group>
    </Link>
  );
}
