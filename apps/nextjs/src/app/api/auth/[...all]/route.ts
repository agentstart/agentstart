/* agent-frontmatter:start
AGENT: Authentication API route handler
PURPOSE: Handles all auth endpoints (signin, signout, session, etc.)
USAGE: Called automatically by authClient methods
SEARCHABLE: auth api, signin endpoint, signup endpoint, oauth callback
agent-frontmatter:end */

import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
