#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create .next/types directory if it doesn't exist
const typesDir = path.join(__dirname, '../.next/types');
fs.mkdirSync(typesDir, { recursive: true });

// Generate stub types file for CI
const stubTypes = `// Auto-generated stub types for CI
type AppRoutes = string;
type PageRoutes = never;
type LayoutRoutes = string;
type RedirectRoutes = never;
type RewriteRoutes = never;
type AppRouteHandlerRoutes = string;
type Routes = AppRoutes | PageRoutes | LayoutRoutes | RedirectRoutes | RewriteRoutes | AppRouteHandlerRoutes;

interface ParamMap {
  [key: string]: Record<string, string | string[]>;
}

export type ParamsOf<Route extends Routes> = ParamMap[Route];

interface LayoutSlotMap {
  [key: string]: never;
}

export type { AppRoutes, PageRoutes, LayoutRoutes, RedirectRoutes, RewriteRoutes, ParamMap, AppRouteHandlerRoutes };

declare global {
  interface PageProps<AppRoute extends AppRoutes> {
    params: Promise<Record<string, string | string[]>>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }

  type LayoutProps<LayoutRoute extends LayoutRoutes> = {
    params: Promise<Record<string, string | string[]>>;
    children: React.ReactNode;
  } & {
    [K in LayoutSlotMap[LayoutRoute]]: React.ReactNode;
  };

  interface RouteContext<AppRouteHandlerRoute extends AppRouteHandlerRoutes> {
    params: Promise<Record<string, string | string[]>>;
  }
}
`;

fs.writeFileSync(path.join(typesDir, 'routes.d.ts'), stubTypes);
console.log('✅ Generated stub types for CI');