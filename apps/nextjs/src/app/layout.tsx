import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils";

import "@/app/globals.css";
import { Providers } from "@/components/layout/client-layout";

export const metadata: Metadata = {
  title: "Agent Stack - The AI-First Fullstack Template",
  description:
    "The first fullstack template built for AI agents, not humans - agent-optimized architecture that makes vibe coding actually work",
  openGraph: {
    type: "website",
    url: "https://agent-stack.dev",
    title: "Agent Stack - The AI-First Fullstack Template",
    description:
      "The first fullstack template built for AI agents, not humans - agent-optimized architecture that makes vibe coding actually work",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agent Stack - AI-First Fullstack Template",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@agentstackdev",
    title: "Agent Stack - The AI-First Fullstack Template",
    description:
      "The first fullstack template built for AI agents, not humans - agent-optimized architecture that makes vibe coding actually work",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
