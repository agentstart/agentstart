/* agent-frontmatter:start
AGENT: Client-side authentication instance
PURPOSE: Provides auth methods for client components and hooks
USAGE: import { authClient } from '@/lib/auth/client'
COMMON TASKS:
  - authClient.signIn.email({ email, password })
  - authClient.signIn.social({ provider: 'github' })
  - authClient.signOut()
  - authClient.useSession() - React hook for session
RETURNS: Auth client with all client-side methods
SEARCHABLE: client auth, auth hooks, useSession, signIn, signOut
agent-frontmatter:end */

import { initAuthClient } from "@acme/auth/client";

export const authClient = initAuthClient();
