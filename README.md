# arx

Authorization library for Node.js and TypeScript. Provides Role-Based Access Control (RBAC) with direct permission grants — storage-agnostic via an adapter pattern.

```ts
import { createAuthorization } from '@arxjs/core'
import { PrismaAdapter } from '@arxjs/prisma'

const { can, assignRole, createRole } = createAuthorization({
  adapter: new PrismaAdapter(prisma),
})

await createRole('editor', { permissions: ['post:edit', 'post:view'] })
await assignRole('user-1', 'editor')

await can('user-1', 'post:edit') // true
```

## Packages

| Package | Description |
|---|---|
| [`@arxjs/core`](packages/core) | Core authorization logic and `StorageAdapter` interface |
| [`@arxjs/prisma`](packages/prisma) | Adapter for [Prisma](https://www.prisma.io/) — PostgreSQL, MySQL, SQLite, SQL Server, MongoDB |
| [`@arxjs/drizzle`](packages/drizzle) | Adapter for [Drizzle ORM](https://orm.drizzle.team/) — PostgreSQL, MySQL, SQLite |
| [`@arxjs/typeorm`](packages/typeorm) | Adapter for [TypeORM](https://typeorm.io/) — PostgreSQL, MySQL, SQLite, SQL Server |
| [`@arxjs/nestjs`](packages/nestjs) | NestJS module, injectable `ArxService`, route guard, and decorators |

## Examples

| Example | Stack |
|---|---|
| [`express-drizzle-sqlite`](examples/express-drizzle-sqlite) | Express + Drizzle ORM + in-memory SQLite |
| [`nestjs-typeorm-sqlite`](examples/nestjs-typeorm-sqlite) | NestJS + TypeORM + in-memory SQLite, using `@arxjs/nestjs`'s guard and decorators |

Both are runnable end-to-end. From the repo root:

```bash
pnpm install
pnpm build
pnpm --filter example-express-drizzle-sqlite start   # or: --filter nestjs-typeorm-sqlite
```

See each example's own README for what it demonstrates and sample requests to try.

## How it works

arx separates the authorization logic from the database. You pick an adapter that matches your ORM, register it once, and use the same API regardless of your database.

Permissions can be granted to users directly, or through roles. The `can()` check resolves both sources automatically.

```
User ──── has role ────► Role ──── has permission ────► Permission
     └─── has permission (direct) ────────────────────► Permission
```

## License

MIT
