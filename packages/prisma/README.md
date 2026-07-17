# @arxjs/prisma

[Prisma](https://www.prisma.io/) adapter for [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core). Supports any database Prisma supports — PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB.

## Installation

```bash
pnpm add @arxjs/prisma @arxjs/core
# npm install @arxjs/prisma @arxjs/core
```

You also need `@prisma/client` (runtime) and `prisma` (CLI to run migrations):

```bash
pnpm add @prisma/client
pnpm add -D prisma
```

## Setup

### 1. Add the arx models to your `schema.prisma`

```prisma
model Role {
  id          String           @id @default(cuid())
  name        String           @unique
  createdAt   DateTime         @default(now())
  permissions RolePermission[]
  users       UserRole[]

  @@map("roles")
}

model Permission {
  id        String           @id @default(cuid())
  name      String           @unique
  createdAt DateTime         @default(now())
  roles     RolePermission[]
  users     UserPermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId String
  roleId String
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

model UserPermission {
  userId       String
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([userId, permissionId])
  @@map("user_permissions")
}
```

> **Model name conflicts?** The model names (`Role`, `Permission`, etc.) are intentionally unprefixed for ergonomics. If they conflict with your own models, rename them (e.g. `ArxRole`) and update the `@@map` names to keep the same underlying table names.

### 2. Generate and run the migration

```bash
npx prisma migrate dev --name add-arx
```

This command generates a SQL migration file and applies it to your development database. For production deployments, use `prisma migrate deploy` instead (it applies existing migrations without generating new ones).

### 3. Create the adapter

```ts
import { PrismaClient } from '@prisma/client'
import { createAuthorization } from '@arxjs/core'
import { PrismaAdapter } from '@arxjs/prisma'

const prisma = new PrismaClient()

const arx = createAuthorization({
  adapter: new PrismaAdapter(prisma),
})
```

## Usage

```ts
await arx.createRole('editor', { permissions: ['post:edit', 'post:view'] })
await arx.assignRole('user-1', 'editor')
await arx.can('user-1', 'post:edit') // true
```

See [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core) for the full API reference.

## How it works

`PrismaAdapter` accepts any object that satisfies the `PrismaClientForArx` interface — the same structural typing pattern used by NextAuth. You do **not** need to pass a fully-generated `PrismaClient`; any object with the required table accessors works.

This means the adapter compiles without running `prisma generate`, and works even if your Prisma client is extended or wrapped (e.g. with middleware).

## Peer dependencies

| Package | Version |
|---|---|
| `@arxjs/core` | `*` |
| `@prisma/client` | `>=5.0.0` |

## License

MIT
