// AGENT: Navigation bar with responsive design
// PURPOSE: Main navigation with auth state, theme toggle, and mobile menu
// USAGE: <NavBar /> - typically in root layout
// FEATURES:
//   - Responsive (desktop menu + mobile sheet)
//   - Auth-aware (shows user menu or sign in)
//   - Theme switcher integration
//   - Scroll-based active section highlighting
//   - Hide on scroll behavior
//   - Corner border decorations
// CUSTOMIZATION: Modify routeList for navigation items
// SEARCHABLE: navbar, navigation, header, menu

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
import { CornerBorders } from "./corner-borders";
import { siteConfig } from "@acme/config";
import { Logo } from "../logo";

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
    <header
      className={cn(
        "sticky z-50 flex w-full items-center justify-center border-y transition-all duration-800 ease-in-out",
        {
          // Default state (not scrolled)
          "top-0 border-transparent": !isScrolled,
          // Scrolled state
          "border-border bg-background/75 top-4 backdrop-blur-xl": isScrolled,
        },
      )}
    >
      <CornerBorders
        className={cn(isScrolled ? "opacity-100" : "opacity-0", "duration-800")}
      />

      <div
        className={cn(
          "flex w-full max-w-6xl items-center justify-between px-6 py-2.5 transition-all duration-800 ease-in-out",
          {
            // Default state (not scrolled)
            "border-transparent": !isScrolled,
            // Scrolled state
            "": isScrolled,
          },
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-1 text-lg font-semibold"
        >
          <Logo />
          {siteConfig.name}
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
              className="bg-card border-secondary flex flex-col justify-between"
            >
              <div>
                <SheetHeader className="mb-4 ml-4">
                  <SheetTitle className="flex items-center">
                    <Link href="/" className="flex items-center font-bold">
                      {siteConfig.name}
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
                      className="justify-start rounded-none text-base"
                    >
                      <Link href={href}>{label}</Link>
                    </Button>
                  ))}
                </div>
              </div>

              <SheetFooter className="flex-col items-start justify-start sm:flex-col">
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
