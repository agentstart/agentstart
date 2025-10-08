/* agent-frontmatter:start
AGENT: Client-side providers wrapper component
PURPOSE: Wrap application with all necessary client providers
USAGE: <Providers>{children}</Providers> in root layout
PROVIDERS:
  - RootProvider: Fumadocs root provider
  - ThemeProvider: Dark/light mode support
  - QueryClientProvider: TanStack Query provider
  - AuthUIProvider: Authentication UI components
  - Toaster: Toast notifications
SEARCHABLE: providers, client providers, app providers
agent-frontmatter:end */

"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth/client";

/* agent-frontmatter:start
AGENT: Main providers wrapper
CUSTOMIZATION: Add new providers here as needed
agent-frontmatter:end */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthUIProvider
            authClient={authClient}
            navigate={router.push}
            replace={router.replace}
            onSessionChange={() => {
              // Clear router cache (protected routes)
              router.refresh();
            }}
            Link={Link}
            emailOTP
            social={{
              providers: ["github", "google"],
            }}
            account={{
              basePath: "/dashboard", // Settings views will be at /dashboard/settings, /dashboard/security, etc.
            }}
          >
            {children}
          </AuthUIProvider>
        </QueryClientProvider>

        <Toaster />
      </ThemeProvider>
    </Suspense>
  );
}
