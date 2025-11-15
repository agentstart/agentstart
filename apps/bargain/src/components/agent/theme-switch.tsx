/* agent-frontmatter:start
AGENT: Theme switcher components
PURPOSE: Toggle between light/dark/system themes
USAGE: <SimpleThemeSwitch /> or <ThemeSwitch />
EXPORTS: SimpleThemeSwitch, ThemeSwitch
FEATURES:
  - Icon button for quick theme toggle (SimpleThemeSwitch)
  - Tab-based theme selector (ThemeSwitch)
  - System theme detection and display
  - Smooth transitions between themes
SEARCHABLE: theme toggle, dark mode, light mode, theme switcher
agent-frontmatter:end */

"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "agentstart/client";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SimpleThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - use default until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-foreground transition-colors"
      >
        <SunIcon weight="duotone" className="size-4" />
      </Button>
    );
  }

  // Resolve system theme to actual theme
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const icon =
    resolvedTheme === "dark" ? (
      <MoonIcon weight="duotone" className="size-4" />
    ) : (
      <SunIcon weight="duotone" className="size-4" />
    );

  const nextTheme = resolvedTheme === "light" ? "dark" : "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 rounded-full text-foreground transition-colors"
      onClick={() => {
        setTheme(nextTheme);
      }}
    >
      {icon}
    </Button>
  );
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - use a default value until mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme : "system";

  return (
    <Tabs
      value={currentTheme}
      onValueChange={(value) => setTheme(value as any)}
    >
      <TabsList className="h-8 overflow-hidden">
        <ThemeSwitchTrigger value="system">
          <MonitorIcon className="size-4" />
        </ThemeSwitchTrigger>
        <ThemeSwitchTrigger value="light">
          <SunIcon weight="duotone" className="size-4" />
        </ThemeSwitchTrigger>
        <ThemeSwitchTrigger value="dark">
          <MoonIcon weight="duotone" className="size-4" />
        </ThemeSwitchTrigger>
      </TabsList>
    </Tabs>
  );
}

function ThemeSwitchTrigger({
  children,
  value,
}: React.PropsWithChildren<{ value: string }>) {
  return (
    <TabsTrigger
      className="flex size-[26px] items-center justify-center rounded-full p-0 transition-colors data-[state=active]:border-none data-[state=inactive]:border-none data-[state=active]:bg-white dark:data-[state=active]:bg-input"
      value={value}
    >
      {children}
    </TabsTrigger>
  );
}
