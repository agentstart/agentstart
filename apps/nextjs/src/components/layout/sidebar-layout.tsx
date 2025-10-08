"use client";

/* agent-frontmatter:start
AGENT: Generic sidebar layout component
USAGE: Pass navigation data through props for flexible sidebar layouts
agent-frontmatter:end */

import { siteConfig } from "@agent-stack/config";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { UserDropmenu } from "@/components/controls/user-dropmenu";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { NavSecondary } from "./nav-secondary";

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface SidebarLayoutProps
  extends React.ComponentProps<typeof Sidebar> {
  navMain: NavItem[];
  navSecondary: NavItem[];
  logoHref?: string;
  showUserMenu?: boolean;
  sidebarWidth?: string;
}

export function SidebarLayout({
  navMain,
  navSecondary,
  logoHref = "/dashboard",
  showUserMenu = true,
  sidebarWidth = "19rem",
  children,
  ...props
}: SidebarLayoutProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
    >
      <Sidebar variant="sidebar" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href={logoHref}>
                  <Logo background />
                  <span className="font-semibold text-base">
                    {siteConfig.name}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.url === pathname}
                  >
                    <a href={item.url} className="font-medium">
                      {item.icon && <item.icon />}
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <NavSecondary items={navSecondary} className="mt-auto" />
        </SidebarContent>
        {showUserMenu && (
          <SidebarFooter>
            <UserDropmenu />
          </SidebarFooter>
        )}
      </Sidebar>

      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
