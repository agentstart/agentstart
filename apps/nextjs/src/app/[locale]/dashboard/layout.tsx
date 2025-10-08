/* agent-frontmatter:start
AGENT: Dashboard route group layout
PURPOSE: Wrap all dashboard pages with sidebar navigation
FEATURES: Consistent dashboard layout with sidebar
ROUTES: /dashboard, /dashboard/settings, etc.
SEARCHABLE: dashboard layout, dashboard wrapper
agent-frontmatter:end */

"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  MessageSquare,
  Settings,
  MessageCircle,
  HelpingHand,
} from "lucide-react";

const navMain = [
  {
    title: "Chat",
    url: "/dashboard/chat",
    icon: MessageSquare,
  },
];

const navSecondary = [
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
  {
    title: "Feedback",
    url: "/dashboard/feedback",
    icon: MessageCircle,
  },
];

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <SidebarLayout navMain={navMain} navSecondary={navSecondary}>
      {props.children}
    </SidebarLayout>
  );
}
