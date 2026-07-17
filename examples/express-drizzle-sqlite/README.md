# Express + Drizzle + SQLite example

A minimal blog API showing end-to-end `arx` usage with Express and an in-memory SQLite database via `@arxjs/drizzle`.

Demonstrates:
- Building an adapter and calling `createAuthorization` ([`src/db.ts`](src/db.ts))
- Seeding roles and permissions ([`src/seed.ts`](src/seed.ts))
- An Express middleware that wraps `auth.can()` ([`src/middleware.ts`](src/middleware.ts))
- Protecting routes with that middleware ([`src/routes.ts`](src/routes.ts))

## Running it

This example depends on the workspace packages via `workspace:*`, which resolve to their **built** output — so you need to build the monorepo once before this example will run.

From the **repo root**:

```bash
pnpm install
pnpm build
pnpm --filter example-express-drizzle-sqlite start
```

The server starts at `http://localhost:3000`, using an in-memory database seeded with three users:

| User (`x-user-id` header) | Role | Can |
|---|---|---|
| `user-1` | admin | create, read, update, delete posts; manage users |
| `user-2` | editor | create, read, update posts |
| `user-3` | viewer | read posts only |

Note the database is in-memory — it resets every time you restart the server.

## Trying it out

```bash
# Allowed — user-3 (viewer) can read
curl http://localhost:3000/api/posts -H "x-user-id: user-3"

# Forbidden — user-3 (viewer) cannot create
curl -X POST http://localhost:3000/api/posts -H "x-user-id: user-3" -H "Content-Type: application/json" -d '{"title":"New post"}'

# Allowed — user-2 (editor) can create
curl -X POST http://localhost:3000/api/posts -H "x-user-id: user-2" -H "Content-Type: application/json" -d '{"title":"New post"}'

# Unauthorized — no x-user-id header
curl http://localhost:3000/api/posts
```

## A note on the table setup

[`src/db.ts`](src/db.ts) creates the five `arx` tables with raw `CREATE TABLE IF NOT EXISTS` SQL for simplicity, since this example runs against a throwaway in-memory database. In a real app with a persistent database, use the `drizzle-kit` migration workflow documented in the [`@arxjs/drizzle` README](../../packages/drizzle/README.md) instead.
