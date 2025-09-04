// AGENT: Theme switcher components
// PURPOSE: Toggle between light/dark/system themes
// EXPORTS:
//   - SimpleThemeSwitch: Icon button for quick theme toggle
//   - ThemeSwitch: Tab-based theme selector
// USAGE: <SimpleThemeSwitch /> or <ThemeSwitch />
// SEARCHABLE: theme toggle, dark mode, light mode, theme switcher

"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonitorCog, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";

export function SimpleThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground size-8 rounded-full transition-colors"
      >
        <Sun className="size-4" />
      </Button>
    );
  }

  const icon =
    theme === "system" ? (
      <MonitorCog className="size-4" />
    ) : theme === "dark" ? (
      <Moon className="size-4" />
    ) : (
      <Sun className="size-4" />
    );

  const nextTheme =
    theme === "system" ? "light" : theme === "light" ? "dark" : "system";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-foreground size-8 rounded-full transition-colors"
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

  return (
    <Tabs value={theme} onValueChange={(value) => setTheme(value)}>
      <TabsList className="h-8 overflow-hidden rounded-full">
        <ThemeSwitchTrigger value="system">
          <MonitorCog className="size-4" strokeWidth={2} aria-hidden="true" />
        </ThemeSwitchTrigger>
        <ThemeSwitchTrigger value="light">
          <Sun className="size-4" strokeWidth={2} aria-hidden="true" />
        </ThemeSwitchTrigger>
        <ThemeSwitchTrigger value="dark">
          <Moon className="size-4" strokeWidth={2} aria-hidden="true" />
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
      className="dark:data-[state=active]:bg-input flex size-[26px] items-center justify-center rounded-full p-0 transition-colors data-[state=active]:border-none data-[state=active]:bg-white data-[state=inactive]:border-none"
      value={value}
    >
      {children}
    </TabsTrigger>
  );
}
