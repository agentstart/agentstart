// AGENT: Dashboard route group layout
// PURPOSE: Wrap all dashboard pages with sidebar navigation
// FEATURES: Consistent dashboard layout with sidebar
// ROUTES: /dashboard, /dashboard/settings, etc.
// SEARCHABLE: dashboard layout, dashboard wrapper

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function Layout(props: { children: React.ReactNode }) {
  return <DashboardLayout>{props.children}</DashboardLayout>;
}
