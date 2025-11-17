import "@/app/global.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
        <GoogleAnalytics gaId="G-J59YLZ3T0T" />
      </body>
    </html>
  );
}
