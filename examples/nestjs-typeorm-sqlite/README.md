# NestJS + TypeORM + SQLite example

A minimal blog API showing end-to-end `arx` usage with NestJS, `@arxjs/nestjs`'s global guard and decorators, and an in-memory SQLite database via `@arxjs/typeorm`.

Demonstrates:
- Wiring `ArxModule.forRootAsync` to a TypeORM `DataSource` and registering `ArxGuard` globally via `APP_GUARD` ([`src/app.module.ts`](src/app.module.ts))
- Declarative route protection with `@RequirePermissions` and `@RequireRole` ([`src/posts/posts.controller.ts`](src/posts/posts.controller.ts))
- A programmatic check inside a service via the injected `ArxService` ([`src/posts/posts.service.ts`](src/posts/posts.service.ts))
- Turning `onUnauthorized`/`onForbidden` hooks into real NestJS exceptions
- Seeding roles and permissions on startup ([`src/seed/seed.service.ts`](src/seed/seed.service.ts))

## Running it

This example depends on the workspace packages via `workspace:*`, which resolve to their **built** output — so you need to build the monorepo once before this example will run.

From the **repo root**:

```bash
pnpm install
pnpm build
pnpm --filter nestjs-typeorm-sqlite start
```

The server starts at `http://localhost:3000/api`, using an in-memory database seeded with three users:

| User (`x-user-id` header) | Role | Can |
|---|---|---|
| `user-1` | admin | create, read, update, delete posts; bulk-delete; manage users |
| `user-2` | editor | create, read, update posts |
| `user-3` | viewer | read posts only |

Note the database is in-memory — it resets every time you restart the server.

## Trying it out

```bash
# Public — no decorator, allowed through even with the global guard active
curl http://localhost:3000/api/posts/health

# Allowed — user-3 (viewer) can read
curl http://localhost:3000/api/posts -H "x-user-id: user-3"

# Forbidden (403) — user-3 (viewer) cannot bulk-delete (requires the admin role)
curl -X POST http://localhost:3000/api/posts/bulk-delete -H "x-user-id: user-3"

# Allowed — user-1 (admin) can bulk-delete
curl -X POST http://localhost:3000/api/posts/bulk-delete -H "x-user-id: user-1"

# Unauthorized (401) — no x-user-id header
curl http://localhost:3000/api/posts
```
