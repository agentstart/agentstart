/* agent-frontmatter:start
AGENT: URL helpers
PURPOSE: Resolve canonical API base URLs for agent clients and servers
USAGE: const url = getBaseURL(customUrl, basePath, request, loadEnv)
EXPORTS: getBaseURL
FEATURES:
  - Normalizes environment and request-derived origins
  - Ensures configured base paths are appended when missing
SEARCHABLE: url helper, base url, agent utilities
agent-frontmatter:end */

// https://github.com/better-auth/better-auth/blob/canary/packages/better-auth/src/utils/url.ts

import { AgentStackError } from "@agent-stack/utils";
import { env } from "std-env";

function checkHasPath(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.replace(/\/+$/, "") || "/";
    return pathname !== "/";
  } catch {
    throw new AgentStackError(
      "INVALID_BASE_URL",
      `Invalid base URL: ${url}. Please provide a valid base URL.`,
    );
  }
}

function withPath(url: string, path = "/api/agent") {
  const hasPath = checkHasPath(url);
  if (hasPath) {
    return url;
  }

  const trimmedUrl = url.replace(/\/+$/, "");

  if (!path || path === "/") {
    return trimmedUrl;
  }

  path = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedUrl}${path}`;
}

export function getBaseURL(
  url?: string,
  path?: string,
  request?: Request,
  loadEnv?: boolean,
) {
  if (url) {
    return withPath(url, path);
  }

  if (loadEnv !== false) {
    const fromEnv =
      env.AGENT_STACK_URL ||
      env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      env.PUBLIC_BETTER_AUTH_URL ||
      env.NUXT_PUBLIC_BETTER_AUTH_URL ||
      env.NUXT_PUBLIC_AUTH_URL ||
      (env.BASE_URL !== "/" ? env.BASE_URL : undefined);

    if (fromEnv) {
      return withPath(fromEnv, path);
    }
  }

  const fromRequest = request?.headers.get("x-forwarded-host");
  const fromRequestProto = request?.headers.get("x-forwarded-proto");
  if (fromRequest && fromRequestProto) {
    return withPath(`${fromRequestProto}://${fromRequest}`, path);
  }

  if (request) {
    const url = getOrigin(request.url);
    if (!url) {
      throw new AgentStackError(
        "INVALID_BASE_URL",
        "Could not get origin from request. Please provide a valid base URL.",
      );
    }
    return withPath(url, path);
  }

  if (typeof window !== "undefined" && window.location) {
    return withPath(window.location.origin, path);
  }
  return undefined;
}

export function getOrigin(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin;
  } catch {
    return null;
  }
}

export function getProtocol(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol;
  } catch {
    return null;
  }
}

export function getHost(url: string) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.host;
  } catch {
    return url;
  }
}
