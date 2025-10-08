/* agent-frontmatter:start
AGENT: Navigation bar with responsive design and i18n support
PURPOSE: Main navigation with auth state, theme toggle, and mobile menu
USAGE: <NavBar /> - typically in root layout
FEATURES:
  - Responsive (desktop menu + mobile sheet)
  - Auth-aware (shows user menu or sign in)
  - Theme switcher integration
  - Scroll-based active section highlighting
  - Hide on scroll behavior
  - Corner border decorations
  - i18n support using next-intl
CUSTOMIZATION: Modify routeList for navigation items
SEARCHABLE: navbar, navigation, header, menu
agent-frontmatter:end */

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
import { ThemeSwitch } from "@/components/controls/theme-switch";
import { useAuth } from "@/hooks/use-auth";
import { useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import { useActiveSection } from "@/hooks/use-active-section";
import { CornerBorders } from "./corner-borders";
import { siteConfig } from "@acme/config";
import { Logo } from "../logo";
import { FeedbackButton } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/controls/language-switcher";

interface RouteProps {
  href: string;
  label: string;
  sectionId?: string;
}

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const t = useTranslations("sections.navbar");

  const sectionList: RouteProps[] = [
    {
      href: "/",
      label: t("home"),
      sectionId: "hero",
    },
    {
      href: "#features",
      label: t("features"),
      sectionId: "features",
    },
    {
      href: "#showcase",
      label: t("showcase"),
      sectionId: "showcase",
    },
    {
      href: "#pricing",
      label: t("pricing"),
      sectionId: "pricing",
    },
    {
      href: "#faq",
      label: t("faq"),
      sectionId: "faq",
    },
  ];

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
          className="flex items-center gap-2 text-lg font-semibold"
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
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center">
                    <Link
                      href="/"
                      className="flex items-center gap-2 font-bold"
                    >
                      <Logo />
                      {siteConfig.name}
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-4">
                  {sectionList.map(({ href, label, sectionId }) => (
                    <Link
                      key={sectionId}
                      className="text-muted-foreground hover:text-foreground px-4 text-xl transition-all duration-300 hover:text-2xl"
                      href={href}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              <SheetFooter className="flex-col items-start justify-start sm:flex-col">
                <div className="flex w-full items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <ThemeSwitch />
                    <LanguageSwitcher />
                  </div>

                  {user ? (
                    <UserDropmenu size="icon" />
                  ) : (
                    <Button size="sm" asChild>
                      <Link href="/auth/sign-in">{t("signIn")}</Link>
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

        <div className="hidden items-center gap-4 lg:flex">
          <LanguageSwitcher />
          <FeedbackButton size="sm" />

          {user ? (
            <UserDropmenu size="icon" />
          ) : (
            <Button aria-label={t("getStarted")} asChild size="sm">
              <Link href="/auth/sign-in">{t("getStarted")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
