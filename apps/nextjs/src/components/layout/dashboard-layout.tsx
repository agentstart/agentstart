"use client";

// AGENT: Main navigation menu data
// USAGE: Define sidebar menu items with icons and routes

import * as React from "react";
import {
  MessageSquare,
  SquareTerminal,
  Settings,
  MessageCircle,
  HelpingHand,
} from "lucide-react";

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

const data = {
  navMain: [
    {
      title: "Chat",
      url: "/dashboard/chat",
      icon: MessageSquare,
    },
    {
      title: "Developer",
      url: "/dashboard/dev",
      icon: SquareTerminal,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpingHand,
    },
    {
      title: "Feedback",
      url: "/dashboard/feedback",
      icon: MessageCircle,
    },
  ],
};

export function DashboardLayout({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="sidebar" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
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
              {data.navMain.map((item) => (
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

          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
        <SidebarFooter>
          <UserDropmenu />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>{props.children}</SidebarInset>
    </SidebarProvider>
  );
}
