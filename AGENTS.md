# Quick Start

```bash
bun dev              # 启动开发
bun db:push          # 同步数据库
bun typecheck        # 类型检查
```

## Architecture Overview

```
Next.js App ──▶ oRPC API ──▶ PostgreSQL
     │              │            │
     └──────────────┴────────────┘
                    │
              Better Auth
```

## Common Tasks

### Add API Endpoint

```typescript
// 1. Create: packages/api/src/routers/[name].ts
export const nameRouter = {
  create: protectedProcedure
    .input(type<{ title: string }>())
    .handler(({ input, context }) => {
      /* logic */
    }),
};

// 2. Export: packages/api/src/router.ts
export const appRouter = {
  name: nameRouter,
};

// 3. Use: apps/nextjs/src/app/page.tsx
const { mutate } = useMutation(orpc.name.create.mutationOptions());
```

### Add Database Table

```typescript
// 1. Define: packages/db/src/schema/[name].ts
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// 2. Sync: bun db:push
// 3. Use: db.query.products.findMany()
```

### Add Protected Page

```typescript
// apps/nextjs/src/app/dashboard/page.tsx
import { auth } from "@acme/auth"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const user = await auth.api.getSession({
    headers: await headers()
  })
  if (!user) redirect("/auth/sign-in")
  return <div>Dashboard for {user.email}</div>
}
```

## Capabilities

```typescript
// AGENT: All available capabilities in one place
import { auth } from "@acme/auth"; // Better Auth
import { db } from "@acme/db"; // Drizzle ORM
import { orpc } from "@/lib/orpc"; // oRPC client
import { appRouter } from "@acme/api"; // oRPC server

// Auth operations
const session = await auth.api.getSession({ headers });
await auth.api.signIn({ email, password });
await auth.api.signOut({ headers });

// Database operations
const posts = await db.query.posts.findMany();
await db.insert(posts).values({ title, content });
await db.update(posts).set({ title }).where(eq(posts.id, 1));
await db.delete(posts).where(eq(posts.id, 1));

// API operations (client-side)
const { data } = useQuery(orpc.post.all.queryOptions());
const { mutate } = useMutation(orpc.post.create.mutationOptions());
```

## File Locations

```
apps/nextjs/
  src/app/              # Pages (app router)
  src/components/       # UI components
  src/hooks/           # Custom hooks
  src/lib/             # Utilities

packages/
  api/src/routers/     # API endpoints
  auth/               # Auth config
  db/src/schema/      # Database tables
```

## Error Patterns

```typescript
// AGENT: Common errors and fixes
DB_CONNECTION_FAILED → bun db:push
AUTH_SECRET_MISSING → openssl rand -base64 32 >> .env
MODULE_NOT_FOUND → bun install
DB_SCHEMA_OUT_OF_SYNC → bun db:migrate
```

## Environment Setup

```bash
# Required in .env
POSTGRES_URL="postgres://..."
AUTH_SECRET="$(openssl rand -base64 32)"
BETTER_AUTH_URL="http://localhost:3000"
```

## Commands Reference

```bash
bun dev              # Start development
bun db:push          # Sync database schema
bun db:studio        # Open Drizzle Studio GUI
bun typecheck        # Run type checking
bun lint:fix         # Fix linting issues
bun format:fix       # Format code
bun ui-add [name]    # Add shadcn component
```

## Path Aliases

```typescript
"@acme/*" → "packages/*"
"@/*" → "apps/nextjs/src/*"
```

## Component Patterns

```typescript
// AGENT: Pre-built UI patterns in apps/nextjs/src/components/patterns/
- AuthForm: Login/signup with validation
- DataTable: Sortable table with pagination
- LoadingState: Skeleton loaders
- ErrorBoundary: Error handling wrapper
```

## Features Status

✅ Database (Drizzle)
✅ Auth (Better Auth)
✅ API (oRPC)
✅ Type Safety (TypeScript + Zod)
⏳ Payment (Stripe via Better Auth plugin)
⏳ AI SDK (Vercel AI SDK)
⏳ i18n (next-intl)
⏳ Analytics (Google Analytics)
