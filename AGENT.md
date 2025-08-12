# Quick Start

```bash
bun dev              # 启动开发
bun db:push          # 同步数据库
bun typecheck        # 类型检查
```

## Architecture Overview

```
Next.js App ──▶ tRPC API ──▶ PostgreSQL
     │              │            │
     └──────────────┴────────────┘
                    │
              Better Auth
```

## Common Tasks

### Add API Endpoint

```typescript
// 1. Create: packages/api/src/router/[name].ts
export const nameRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ title: z.string() }))
    .mutation(({ input }) => {
      /* logic */
    }),
});

// 2. Export: packages/api/src/root.ts
export const appRouter = createTRPCRouter({
  name: nameRouter,
});

// 3. Use: apps/nextjs/src/app/page.tsx
const { mutate } = api.name.create.useMutation();
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
import { api } from "~/trpc/react"; // tRPC client
import { appRouter } from "@acme/api"; // tRPC server

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
const { data } = api.post.all.useQuery();
const { mutate } = api.post.create.useMutation();
```

## File Locations

```
apps/nextjs/
  src/app/              # Pages (app router)
  src/components/       # UI components
  src/hooks/           # Custom hooks
  src/lib/             # Utilities

packages/
  api/src/router/      # API endpoints
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
✅ API (tRPC)
✅ Type Safety (TypeScript + Zod)
⏳ Payment (Stripe via Better Auth plugin)
⏳ AI SDK (Vercel AI SDK)
⏳ i18n (next-intl)
⏳ Analytics (Google Analytics)
