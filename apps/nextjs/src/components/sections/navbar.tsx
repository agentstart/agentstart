"use client";

import { Menu } from "lucide-react";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import Link from "next/link";
import { UserButton } from "@daveyplate/better-auth-ui";
import { useAuth } from "@/hooks/use-auth";

interface RouteProps {
  href: string;
  label: string;
}

interface FeatureProps {
  title: string;
  description: string;
}

const routeList: RouteProps[] = [
  {
    href: "/pricing",
    label: "Pricing",
  },
];

const featureList: FeatureProps[] = [
  {
    title: "AI-First Architecture",
    description:
      "AGENT.md driven development with token-efficient conventions.",
  },
  {
    title: "Zero Configuration",
    description:
      "Everything pre-configured: auth, payments, database, and AI SDK.",
  },
  {
    title: "Smart Error Handling",
    description:
      "AI agents can self-diagnose and fix issues without intervention.",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { user } = useAuth();

  return (
    <header className="container flex items-center justify-between py-4">
      <Link href="/" className="flex items-center text-lg font-bold">
        AgentStack
      </Link>

      {/* <!-- Mobile --> */}
      <div className="flex items-center lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Menu
              onClick={() => setIsOpen(!isOpen)}
              className="cursor-pointer lg:hidden"
            />
          </SheetTrigger>

          <SheetContent
            side="left"
            className="bg-card border-secondary flex flex-col justify-between rounded-tr-2xl rounded-br-2xl"
          >
            <div>
              <SheetHeader className="mb-4 ml-4">
                <SheetTitle className="flex items-center">
                  <Link href="/" className="flex items-center font-bold">
                    AgentStack
                  </Link>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-2">
                {routeList.map(({ href, label }) => (
                  <Button
                    key={href}
                    onClick={() => setIsOpen(false)}
                    asChild
                    variant="ghost"
                    className="justify-start text-base"
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </div>
            </div>

            <SheetFooter className="flex-col items-start justify-start sm:flex-col">
              <Separator className="mb-2" />

              <div className="flex w-full items-center justify-between px-4 py-2">
                <AnimatedThemeToggler />

                {user ? (
                  <UserButton size="icon" />
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/auth/sign-in">Sign In</Link>
                  </Button>
                )}
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* <!-- Desktop --> */}
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="bg-card text-base">
              Features
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="grid w-[600px] grid-cols-2 gap-5 p-4">
                <div className="bg-muted flex h-full w-full items-center justify-center rounded-md">
                  <div className="p-6 text-center">
                    <div className="bg-primary/10 text-primary mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                      <span className="text-2xl font-bold">A</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Built for AI agents,
                      <br />
                      not humans
                    </p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {featureList.map(({ title, description }) => (
                    <li
                      key={title}
                      className="hover:bg-muted rounded-md p-3 text-sm"
                    >
                      <p className="text-foreground mb-1 leading-none font-semibold">
                        {title}
                      </p>
                      <p className="text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>

          {routeList.map(({ href, label }) => (
            <NavigationMenuItem key={href}>
              <NavigationMenuLink asChild>
                <Link href={href} className="px-2 text-base">
                  {label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="hidden items-center gap-2 lg:flex">
        <AnimatedThemeToggler />

        {user ? (
          <UserButton size="icon" />
        ) : (
          <Button aria-label="Get Started" asChild>
            <Link href="/auth/sign-in">Get Started</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
