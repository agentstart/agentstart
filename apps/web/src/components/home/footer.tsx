import {
  DiscordLogoIcon,
  GithubLogoIcon,
  TwitterLogoIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { GitHubStars } from "@/components/github-stars";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-border border-t bg-background pt-20 pb-10">
      <div className="container relative z-10 mx-auto px-4">
        {/* Top Row */}
        <div className="mb-20 flex flex-col items-start justify-between sm:mb-40 md:flex-row md:items-center">
          <Link
            href="/"
            className="mb-4 flex items-center gap-2 font-medium font-serif md:mb-0"
          >
            <Logo className="size-10" />
          </Link>

          <div className="flex flex-col gap-4">
            <h2 className="font-medium text-xl md:text-2xl">
              Build production-ready AI agents.
            </h2>
            <div className="flex items-center justify-start gap-4 sm:justify-end">
              <GitHubStars text="Star on Github" />
              <div className="flex gap-4 text-muted-foreground">
                <Link
                  href="https://twitter.com/agentstart"
                  className="transition-colors hover:text-foreground"
                >
                  <TwitterLogoIcon className="size-4" />
                </Link>
                <Link
                  href="https://discord.gg/agentstart"
                  className="transition-colors hover:text-foreground"
                >
                  <DiscordLogoIcon className="size-4" />
                </Link>
                <Link
                  href="https://github.com/agentstart/agentstart"
                  className="transition-colors hover:text-foreground"
                >
                  <GithubLogoIcon className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Huge Background Text */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 flex select-none items-end justify-center overflow-hidden leading-none">
        <h1 className="translate-y-[20%] font-bold text-[15vw] text-foreground/5 tracking-tighter md:text-[20vw]">
          agentstart
        </h1>
      </div>
    </footer>
  );
}
