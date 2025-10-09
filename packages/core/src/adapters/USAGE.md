# Adapter Usage Examples

Each adapter exported from `@agent-stack/core/adapters` follows the same pattern:

1. **Create** an adapter instance by passing the driver specific client.
2. **Initialise** the adapter with the shared context (schema helpers, logging, etc.).
3. **Call** the CRUD helpers produced by the adapter.

Below are minimal examples for the five bundled adapters. Replace the stubbed
clients with your real connections during integration.

```ts
import {
  createAdapterFactory,
  drizzleAdapter,
  kyselyAdapter,
  mongodbAdapter,
  prismaAdapter,
  memoryAdapter,
} from "@agent-stack/core/adapters";
```

## Drizzle ORM

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import { drizzleAdapter } from "@agent-stack/core/adapters";
import { users } from "./schema"; // your table definition

const db = drizzle(postgresClient);
const adapter = drizzleAdapter(db, {
  provider: "pg",
  schema: { users },
  transaction: true,
});

const methods = adapter.initialize(sharedContext);
await methods.create({ model: "users", data: { email: "foo@example.com" } });
```

## Prisma Client

```ts
import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "@agent-stack/core/adapters";

const prisma = new PrismaClient();
const adapter = prismaAdapter(prisma, {
  provider: "postgresql",
  camelCase: true,
  transaction: true,
});
const methods = adapter.initialize(sharedContext);

await methods.update({
  model: "user",
  where: [{ field: "id", value: "1" }],
  update: { status: "inactive" },
});
```

## Kysely

```ts
import { Kysely } from "kysely";
import { kyselyAdapter } from "@agent-stack/core/adapters";

const db = new Kysely<Database>({ dialect });
const adapter = kyselyAdapter(db, {
  provider: "postgresql",
  transaction: true,
});
const methods = adapter.initialize(sharedContext);

const rows = await methods.findMany({ model: "account" });
```

## MongoDB

```ts
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "@agent-stack/core/adapters";

const client = await MongoClient.connect(process.env.MONGODB_URI!);
const adapter = mongodbAdapter(client.db("app"), { camelCase: true });
const methods = adapter.initialize(sharedContext);

await methods.deleteMany({ model: "user", where: [{ field: "status", value: "inactive" }] });
```

## Memory (Ephemeral)

```ts
import { memoryAdapter } from "@agent-stack/core/adapters";

const adapter = memoryAdapter();
const methods = adapter.initialize(sharedContext);

await methods.create({ model: "session", data: { id: "1", status: "active" } });
```

**Note**: `sharedContext` is the object passed into every adapter inside the
runtime (the same values used in unit tests). In a production environment it is
constructed once and reused:

```ts
const sharedContext = {
  schema: {},
  debugLog: console.log,
  getField: () => undefined,
  getDefaultModelName: (model: string) => model,
  getDefaultFieldName: (_model: string, field: string) => field,
  getFieldAttributes: () => ({}),
};
```

Feel free to extend the examples with your actual schema helpers or logging
layer.
