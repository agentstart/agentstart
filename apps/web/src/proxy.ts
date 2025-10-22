import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { i18n } from "@/lib/i18n";

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Redirect /en/docs to /en/docs/introduction
  if (pathname === "/en/docs") {
    return NextResponse.redirect(new URL("/en/docs/introduction", request.url));
  }

  // Redirect /cn/docs to /cn/docs/introduction
  if (pathname === "/cn/docs") {
    return NextResponse.redirect(new URL("/cn/docs/introduction", request.url));
  }

  // Redirect /docs to /en/docs/introduction
  if (pathname === "/docs") {
    return NextResponse.redirect(new URL("/en/docs/introduction", request.url));
  }

  // Continue with i18n middleware
  const i18nMiddleware = createI18nMiddleware(i18n);
  return i18nMiddleware(request, event);
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
