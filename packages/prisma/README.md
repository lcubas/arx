# @arx/prisma

[Prisma](https://www.prisma.io/) adapter for [`@arx/core`](https://github.com/your-org/arx/tree/main/packages/core). Supports any database Prisma supports (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB).

## Installation

```bash
pnpm add @arx/prisma @arx/core
# npm install @arx/prisma @arx/core
```

`@prisma/client` must already be installed and generated in your project.

## Setup

### 1. Add the arx schema to your `prisma/schema.prisma`

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
  id          String             @id @default(cuid())
  name        String             @unique
  createdAt   DateTime           @default(now())
  roles       RolePermission[]
  users       UserPermission[]

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

> **Note:** Model names (`Role`, `Permission`, etc.) are clean and unprefixed. If they collide with your own models, rename them and update the `@@map` table names accordingly.

### 2. Run migrations

```bash
npx prisma migrate dev --name add-arx
```

### 3. Create the adapter

```ts
import { PrismaClient }  from '@prisma/client'
import { createAuthorization } from '@arx/core'
import { PrismaAdapter } from '@arx/prisma'

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

See [`@arx/core`](https://github.com/your-org/arx/tree/main/packages/core) for the full API reference.

## How it works

`PrismaAdapter` accepts any object that implements the minimal `PrismaClientForArx` interface — the same duck-typing pattern used by NextAuth. You do **not** need to pass a fully-generated `PrismaClient`; any object with the required table accessors works.

This means the adapter compiles without running `prisma generate`, and works even if your Prisma client is extended or wrapped.

## Testing your own code against a real database

Use the contract test suite from `@arx/core/testing` to verify your integration end-to-end:

```ts
// e.g., src/tests/prisma-adapter.test.ts
import { testStorageAdapterContract } from '@arx/core/testing'
import { PrismaAdapter } from '@arx/prisma'

testStorageAdapterContract({
  create: () => new PrismaAdapter(prisma),
  reset:  async () => {
    await prisma.userPermission.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.rolePermission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.permission.deleteMany()
  },
})
```

## Peer dependencies

| Package | Version |
|---|---|
| `@arx/core` | `*` |
| `@prisma/client` | `>=5.0.0` |

## License

MIT
