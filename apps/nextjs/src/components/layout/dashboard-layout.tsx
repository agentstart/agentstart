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
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">AgentStack</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu className="gap-2">
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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
