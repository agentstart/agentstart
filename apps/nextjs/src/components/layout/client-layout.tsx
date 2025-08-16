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
