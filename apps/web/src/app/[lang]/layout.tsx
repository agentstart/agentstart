import "@/app/global.css";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";
import { i18n } from "@/lib/i18n";
import { translations } from "@/lib/i18n-translations";

const inter = Inter({
  subsets: ["latin"],
});

const { provider } = defineI18nUI(i18n, { translations });

export default async function RootLayout({
  params,
  children,
}: LayoutProps<"/[lang]">) {
  const lang = (await params).lang;

  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider i18n={provider(lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
