# @arx/drizzle

[Drizzle ORM](https://orm.drizzle.team/) adapter for [`@arx/core`](https://github.com/your-org/arx/tree/main/packages/core). Supports PostgreSQL, MySQL, and SQLite via ready-made schemas for each dialect.

## Installation

```bash
pnpm add @arx/drizzle @arx/core drizzle-orm
# npm install @arx/drizzle @arx/core drizzle-orm
```

## Setup

### 1. Add the arx tables to your schema

Pick the schema file that matches your database dialect and merge it with your own tables:

**PostgreSQL**
```ts
import { schema as arxSchema } from '@arx/drizzle/schema/pg'
import { pgTable, serial, text } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id:    serial('id').primaryKey(),
  title: text('title').notNull(),
})

export const schema = { ...arxSchema, posts }
```

**MySQL**
```ts
import { schema as arxSchema } from '@arx/drizzle/schema/mysql'
import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core'

export const posts = mysqlTable('posts', {
  id:    int('id').primaryKey().autoincrement(),
  title: varchar('title', { length: 255 }).notNull(),
})

export const schema = { ...arxSchema, posts }
```

**SQLite**
```ts
import { schema as arxSchema } from '@arx/drizzle/schema/sqlite'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable('posts', {
  id:    integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
})

export const schema = { ...arxSchema, posts }
```

### 2. Run migrations

```bash
npx drizzle-kit push   # for development / prototyping
npx drizzle-kit generate && npx drizzle-kit migrate  # for production
```

### 3. Create the adapter

Pass your Drizzle `db` instance and the arx schema tables:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { createAuthorization } from '@arx/core'
import { DrizzleAdapter } from '@arx/drizzle'
import { schema } from './schema.js'   // your merged schema

const db = drizzle(process.env.DATABASE_URL)

const arx = createAuthorization({
  adapter: new DrizzleAdapter(db, schema),
})
```

## Usage

```ts
await arx.createRole('editor', { permissions: ['post:edit', 'post:view'] })
await arx.assignRole('user-1', 'editor')
await arx.can('user-1', 'post:edit') // true
```

See [`@arx/core`](https://github.com/your-org/arx/tree/main/packages/core) for the full API reference.

## Schema reference

All arx tables are exported from the dialect-specific schema modules:

| Export | Table name | Description |
|---|---|---|
| `roles` | `roles` | Role definitions |
| `permissions` | `permissions` | Permission definitions |
| `rolePermissions` | `role_permissions` | Role ↔ Permission join |
| `userRoles` | `user_roles` | User ↔ Role assignments |
| `userPermissions` | `user_permissions` | User ↔ Permission direct grants |

```ts
// Access individual tables if needed
import { roles, permissions } from '@arx/drizzle/schema/pg'
```

## Custom `ArxDrizzleSchema`

If you extend or rename the arx tables, you can provide a custom schema object as long as it satisfies the `ArxDrizzleSchema` type:

```ts
import type { ArxDrizzleSchema } from '@arx/drizzle'

const customSchema: ArxDrizzleSchema = {
  roles:           myRolesTable,
  permissions:     myPermissionsTable,
  rolePermissions: myRolePermissionsTable,
  userRoles:       myUserRolesTable,
  userPermissions: myUserPermissionsTable,
}

const arx = createAuthorization({
  adapter: new DrizzleAdapter(db, customSchema),
})
```

## Testing

Use the contract test suite from `@arx/core/testing` to verify your integration end-to-end:

```ts
// e.g., src/tests/drizzle-adapter.test.ts
import { testStorageAdapterContract } from '@arx/core/testing'
import { DrizzleAdapter } from '@arx/drizzle'
import { schema } from '../schema.js'

testStorageAdapterContract({
  create: () => new DrizzleAdapter(db, schema),
  reset:  async () => {
    await db.delete(schema.userPermissions)
    await db.delete(schema.userRoles)
    await db.delete(schema.rolePermissions)
    await db.delete(schema.roles)
    await db.delete(schema.permissions)
  },
})
```

## Peer dependencies

| Package | Version |
|---|---|
| `@arx/core` | `*` |
| `drizzle-orm` | `>=0.31.0` |

## License

MIT
