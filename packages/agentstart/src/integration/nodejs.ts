/* agent-frontmatter:start
AGENT: Node.js integration
PURPOSE: Adapt the Agent router to Node.js HTTP handlers (Express, Connect, etc.)
USAGE: app.all("/api/agent/*", toNodeHandler(start))
EXPORTS: toNodeHandler
FEATURES:
  - Wraps oRPC router with Node.js compatible request/response handlers
  - Converts Node.js IncomingMessage to Web Request API
  - Streams Response back to Node.js ServerResponse
  - Supports Express, Connect, and native Node.js HTTP server
SEARCHABLE: node.js handler, express handler, agent integration, http adapter
agent-frontmatter:end */

import type { IncomingMessage, ServerResponse } from "node:http";

export function toNodeHandler(
  handler:
    | {
        handler: (request: Request) => Promise<Response>;
      }
    | ((request: Request) => Promise<Response>),
) {
  const handleRequest = async (request: Request) => {
    return "handler" in handler ? handler.handler(request) : handler(request);
  };

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      // Determine protocol: check x-forwarded-proto header first (for proxies), then socket
      const forwardedProto = req.headers["x-forwarded-proto"];
      const protocol =
        typeof forwardedProto === "string" && forwardedProto === "https"
          ? "https"
          : (req.socket as unknown as { encrypted?: boolean }).encrypted
            ? "https"
            : "http";

      const host = req.headers.host || "localhost";
      const url = new URL(req.url || "/", `${protocol}://${host}`);

      // Collect request body chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

      // Convert Node.js headers to HeadersInit format
      // Node.js headers can be string | string[] | undefined
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          // For multiple values, set the first one or join them
          for (const v of value) {
            headers.append(key, v);
          }
        } else {
          headers.set(key, value);
        }
      }

      // Convert Node.js request to Web Request
      const webRequest = new Request(url, {
        method: req.method || "GET",
        headers,
        body:
          body && req.method !== "GET" && req.method !== "HEAD"
            ? body
            : undefined,
      });

      // Execute the handler
      const webResponse = await handleRequest(webRequest);

      // Stream the response back to Node.js
      res.statusCode = webResponse.status;
      res.statusMessage = webResponse.statusText;

      // Set response headers
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Stream the response body
      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } finally {
          reader.releaseLock();
        }
      }

      res.end();
    } catch (error) {
      console.error("Error in toNodeHandler:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      } else {
        // If headers are already sent, just end the response
        res.end();
      }
    }
  };
}
