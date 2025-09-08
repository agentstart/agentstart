// AGENT: Secondary navigation component for sidebar
// PURPOSE: Display secondary navigation items in sidebar
// USAGE: <NavSecondary items={[{title, url, icon}]} />
// PROPS:
//   - items: Array of navigation items with title, url, and icon
// FEATURES: Icon support, small button style
// SEARCHABLE: secondary nav, sidebar navigation, menu items

import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { NavItem } from "./sidebar-layout";

// AGENT: Secondary navigation menu component
// CUSTOMIZATION: Pass different items array for different sections
export function NavSecondary({
  items,
  ...props
}: {
  items: NavItem[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild size="sm">
                <a href={item.url}>
                  {item.icon ? <item.icon /> : null}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
