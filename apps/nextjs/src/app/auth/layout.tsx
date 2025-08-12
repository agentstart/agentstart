import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container flex min-h-screen max-w-lg grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      {children}
    </main>
  );
}
