# @arxjs/drizzle

[Drizzle ORM](https://orm.drizzle.team/) adapter for [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core). Supports PostgreSQL, MySQL, and SQLite via dialect-specific adapters.

## Installation

```bash
pnpm add @arxjs/drizzle @arxjs/core drizzle-orm
# npm install @arxjs/drizzle @arxjs/core drizzle-orm
```

## Quick start

Pick the adapter that matches your database. No schema configuration needed — each adapter bundles its own schema internally.

**PostgreSQL**
```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { createAuthorization } from '@arxjs/core'
import { DrizzlePgAdapter } from '@arxjs/drizzle'

const db = drizzle(postgres(process.env.DATABASE_URL))

const arx = createAuthorization({
  adapter: new DrizzlePgAdapter(db),
})
```

**MySQL**
```ts
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { createAuthorization } from '@arxjs/core'
import { DrizzleMysqlAdapter } from '@arxjs/drizzle'

const connection = await mysql.createConnection(process.env.DATABASE_URL)
const db = drizzle(connection)

const arx = createAuthorization({
  adapter: new DrizzleMysqlAdapter(db),
})
```

**SQLite**
```ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { createAuthorization } from '@arxjs/core'
import { DrizzleSqliteAdapter } from '@arxjs/drizzle'

const db = drizzle(new Database('sqlite.db'))

const arx = createAuthorization({
  adapter: new DrizzleSqliteAdapter(db),
})
```

## Setting up the database tables

arx needs five tables in your database. There are two ways to create them.

### Option A — drizzle-kit (recommended)

`drizzle-kit` generates and runs migrations automatically. For it to work, it needs to see the arx tables alongside your own tables in your schema file.

**1. Re-export the arx schema from your schema file**

Pick the subpath that matches your dialect and re-export its contents:

```ts
// src/schema.ts

// Re-export arx tables so drizzle-kit includes them in migrations
export * from '@arxjs/drizzle/schema/pg'     // PostgreSQL
// export * from '@arxjs/drizzle/schema/mysql'  // MySQL
// export * from '@arxjs/drizzle/schema/sqlite' // SQLite

// Your own tables
export const posts = pgTable('posts', {
  id:    text('id').primaryKey(),
  title: text('title').notNull(),
})
```

> **Why re-export?** drizzle-kit reads your schema file to build a complete picture of your database. If the arx tables aren't visible in your schema, drizzle-kit won't generate migration SQL for them. This is the standard Drizzle pattern for third-party schemas.

**2. Point `drizzle.config.ts` to your schema file**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema.ts',  // your schema file that re-exports arx tables
  out:    './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
})
```

**3. Generate and run the migration**

```bash
npx drizzle-kit generate   # creates SQL migration files in ./drizzle
npx drizzle-kit migrate    # applies the migrations to your database
```

For local development, `drizzle-kit push` skips the migration files and applies changes directly:

```bash
npx drizzle-kit push
```

### Option B — manual SQL

If you manage your own migrations, see the [database schema reference](https://github.com/lcubas/arxjs/tree/main/packages/core#database-schema) in `@arxjs/core`. It contains a database-agnostic diagram of all five tables with their columns and constraints.

## Usage

```ts
await arx.createRole('editor', { permissions: ['post:edit', 'post:view'] })
await arx.assignRole('user-1', 'editor')
await arx.can('user-1', 'post:edit') // true
```

See [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core) for the full API reference.

## Schema reference

The arx table definitions are exported from the dialect-specific schema subpaths:

| Subpath | Dialect |
|---|---|
| `@arxjs/drizzle/schema/pg` | PostgreSQL |
| `@arxjs/drizzle/schema/mysql` | MySQL / MariaDB |
| `@arxjs/drizzle/schema/sqlite` | SQLite |

Each exports five table objects (`roles`, `permissions`, `rolePermissions`, `userRoles`, `userPermissions`) and a `schema` object that bundles all five.

```ts
// Access individual tables if needed (e.g. for manual queries)
import { roles, permissions } from '@arxjs/drizzle/schema/pg'
```

## Advanced: using the relational query API

Drizzle's relational query API (`db.query.roles.findMany(...)`) requires the schema to be passed to the `drizzle()` constructor. If you want to use this API on arx tables directly, merge the arx schema into your `drizzle()` call:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import * as arxSchema from '@arxjs/drizzle/schema/pg'
import * as mySchema from './schema'

const db = drizzle(client, {
  schema: { ...arxSchema, ...mySchema },
})

// Now db.query.roles is typed and available
const allRoles = await db.query.roles.findMany()
```

In most cases you won't need to query arx tables directly — the adapter handles all of that.

## Advanced: custom table names

If you need to rename the arx tables (e.g. to avoid conflicts with existing tables), you can extend `DrizzleAdapter` with your own schema object:

```ts
import { DrizzleAdapter } from '@arxjs/drizzle'
import type { ArxDrizzleSchema } from '@arxjs/drizzle'
import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

// Define renamed versions of the arx tables
const myRoles = pgTable('auth_roles', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
// ... define all five tables

const customSchema: ArxDrizzleSchema = {
  roles:           myRoles,
  permissions:     myPermissions,
  rolePermissions: myRolePermissions,
  userRoles:       myUserRoles,
  userPermissions: myUserPermissions,
}

class MyAdapter extends DrizzleAdapter {
  constructor(db: AnyDrizzleDB) {
    super(db, customSchema)
  }
}
```

## Peer dependencies

| Package | Version |
|---|---|
| `@arxjs/core` | `*` |
| `drizzle-orm` | `>=0.31.0` |

## License

MIT
