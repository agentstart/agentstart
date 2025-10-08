/* agent-frontmatter:start
AGENT: Console route group layout
PURPOSE: Wrap all console pages with sidebar navigation
FEATURES: Consistent console layout with sidebar
ROUTES: /console/feedbacks, /console/users, etc.
SEARCHABLE: console layout, console wrapper
agent-frontmatter:end */

"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  SquareTerminal,
  Settings,
  HelpingHand,
  MessageSquareHeart,
  LayoutDashboard,
} from "lucide-react";

const navMain = [
  {
    title: "Users",
    url: "/console/users",
    icon: SquareTerminal,
  },
  {
    title: "Feedbacks",
    url: "/console/feedbacks",
    icon: MessageSquareHeart,
  },
];

const navSecondary = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Docs",
    url: "/docs",
    icon: HelpingHand,
  },
];

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <SidebarLayout navMain={navMain} navSecondary={navSecondary}>
      {props.children}
    </SidebarLayout>
  );
}
