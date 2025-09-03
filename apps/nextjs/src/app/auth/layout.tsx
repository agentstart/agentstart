// AGENT: Authentication pages layout
// PURPOSE: Layout wrapper for all auth pages (sign-in, sign-up, etc.)
// FEATURES:
//   - Responsive viewport configuration
//   - Centered content container
//   - Mobile-optimized viewport settings
// ROUTES: /auth/*, /auth/sign-in, /auth/sign-up
// SEARCHABLE: auth layout, authentication wrapper

import type { Viewport } from "next";

// AGENT: Mobile-optimized viewport settings
// PURPOSE: Prevent zoom and ensure proper mobile display
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container flex min-h-screen max-w-4xl grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      {children}
    </main>
  );
}
