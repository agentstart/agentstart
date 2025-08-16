import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function Layout(props: { children: React.ReactNode }) {
  return <DashboardLayout>{props.children}</DashboardLayout>;
}
