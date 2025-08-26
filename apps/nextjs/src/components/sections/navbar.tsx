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
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserDropmenu } from "@/components/controls/user-dropmenu";
import { SimpleThemeSwitch } from "@/components/controls/theme-switch";
import { useAuth } from "@/hooks/use-auth";
import { useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import { useActiveSection } from "@/hooks/use-active-section";

interface RouteProps {
  href: string;
  label: string;
  sectionId?: string;
}

const sectionList: RouteProps[] = [
  {
    href: "/",
    label: "Home",
    sectionId: "hero",
  },
  {
    href: "#features",
    label: "Features",
    sectionId: "features",
  },
  {
    href: "#showcase",
    label: "Showcase",
    sectionId: "showcase",
  },
  {
    href: "#pricing",
    label: "Pricing",
    sectionId: "pricing",
  },
  {
    href: "#faq",
    label: "FAQ",
    sectionId: "faq",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user } = useAuth();
  const { scrollY } = useScroll();

  // Track active section for highlighting
  const activeSection = useActiveSection(
    sectionList.map((s) => s.sectionId || "").filter(Boolean),
  );

  // Listen to scroll changes and update state
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 12);
  });

  return (
    <header className="sticky top-4 z-50 flex w-full items-center justify-center">
      <div
        className={cn(
          "border-border bg-background/75 flex w-full items-center justify-between border px-6 py-2.5 transition-all duration-300",
          {
            // Default state (not scrolled)
            "container border-transparent": !isScrolled,
            // Scrolled state
            "border-border max-w-4xl rounded-2xl backdrop-blur-xl": isScrolled,
          },
        )}
      >
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
                  {sectionList.map(({ href, label, sectionId }) => (
                    <Button
                      key={href}
                      onClick={() => setIsOpen(false)}
                      asChild
                      variant={
                        activeSection === sectionId ? "secondary" : "ghost"
                      }
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
                  <SimpleThemeSwitch />

                  {user ? (
                    <UserDropmenu size="icon" />
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
            {sectionList.map(({ href, label, sectionId }) => (
              <NavigationMenuItem key={href}>
                <NavigationMenuLink asChild>
                  <Button
                    asChild
                    variant={activeSection === sectionId ? "outline" : "ghost"}
                    size="sm"
                    className="focus:bg-inherit"
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden items-center gap-2 lg:flex">
          <SimpleThemeSwitch />

          {user ? (
            <UserDropmenu size="icon" />
          ) : (
            <Button aria-label="Get Started" asChild>
              <Link href="/auth/sign-in">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
