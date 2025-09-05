"use client";

// AGENT: Generic sidebar layout component
// USAGE: Pass navigation data through props for flexible sidebar layouts

import * as React from "react";
import type { LucideIcon } from "lucide-react";

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
import Link from "next/link";
import { NavSecondary } from "./nav-secondary";
import { UserDropmenu } from "@/components/controls/user-dropmenu";
import { siteConfig } from "@acme/config";
import { Logo } from "@/components/logo";
import { usePathname } from "next/navigation";

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
                  <span className="text-base font-semibold">
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
