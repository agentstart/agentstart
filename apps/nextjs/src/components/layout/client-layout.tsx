// AGENT: Client-side providers wrapper component
// PURPOSE: Wrap application with all necessary client providers
// USAGE: <Providers>{children}</Providers> in root layout
// PROVIDERS:
//   - ThemeProvider: Dark/light mode support
//   - TRPCReactProvider: tRPC client context
//   - AuthUIProvider: Authentication UI components
//   - Toaster: Toast notifications
// SEARCHABLE: providers, client providers, app providers

"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ThemeProvider } from "next-themes";

import { authClient } from "@/lib/auth/client";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { Toaster } from "@/components/ui/sonner";

// AGENT: Main providers wrapper
// CUSTOMIZATION: Add new providers here as needed
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TRPCReactProvider>
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
        </TRPCReactProvider>

        <Toaster />
      </ThemeProvider>
    </Suspense>
  );
}
