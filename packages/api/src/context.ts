/* agent-frontmatter:start
AGENT: oRPC context creation
PURPOSE: Create request context with auth, database, and session
USAGE: Used by oRPC router for all procedures
FEATURES:
  - Authentication context from Better Auth
  - Database connection
  - User session handling
  - Request headers access
SEARCHABLE: orpc context, api context, auth context
agent-frontmatter:end */

import type { Auth, Session } from "@agent-stack/auth";
import type { db as dbInstance } from "@agent-stack/db/client";

export interface Context {
  db: typeof dbInstance;
  auth: Auth;
  session: Session | null; // Better Auth session type
  user: Session["user"] | null; // Better Auth user type
  headers: Headers;
}

export interface CreateContextOptions {
  db: typeof dbInstance;
  auth: Auth;
  headers: Headers;
}

export async function createContext(
  opts: CreateContextOptions,
): Promise<Context> {
  const { db, auth, headers } = opts;

  // Get session from auth
  const session = await auth.api.getSession({ headers });

  return {
    db,
    auth,
    session,
    user: session?.user ?? null,
    headers,
  };
}
