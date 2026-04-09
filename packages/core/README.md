# @arx/core

Modern, type-safe authorization library for Node.js and TypeScript. Provides Role-Based Access Control (RBAC) with direct permission grants — storage-agnostic via an adapter pattern.

## Features

- **RBAC + direct permissions** — assign roles and/or permissions directly to users
- **Storage-agnostic** — bring your own database via a `StorageAdapter`; official adapters for [Prisma](./../prisma) and [Drizzle ORM](./../drizzle) are available
- **Fully typed** — strict TypeScript 5.x, zero `any` in the public API
- **Minimal surface** — one factory function, everything else is tree-shakeable
- **Batteries included for testing** — `InMemoryAdapter` and a reusable contract test suite

## Installation

```bash
pnpm add @arx/core
# npm install @arx/core
# yarn add @arx/core
```

## Quick start

```ts
import { createAuthorization } from '@arx/core'
import { PrismaAdapter } from '@arx/prisma'

const arx = createAuthorization({
  adapter: new PrismaAdapter(prisma),
})

// Set up roles and permissions once (e.g., in a seed script)
await arx.createPermission('post:edit')
await arx.createPermission('post:delete')
await arx.createRole('editor', { permissions: ['post:edit'] })

// Assign roles and permissions to users
await arx.assignRole('user-1', 'editor')
await arx.assignPermission('user-1', 'post:delete') // direct grant

// Check access
await arx.can('user-1', 'post:edit')    // true  (via role)
await arx.can('user-1', 'post:delete')  // true  (direct)
await arx.can('user-2', 'post:edit')    // false
```

## API

### `createAuthorization(config)`

Returns an `Authorization` instance bound to the provided adapter.

```ts
const arx = createAuthorization({ adapter: new InMemoryAdapter() })
```

### Checking access

```ts
arx.can(userId, permission)                   // boolean — any permission (direct or via role)
arx.canAll(userId, [permission, ...])         // boolean — must hold ALL
arx.canAny(userId, [permission, ...])         // boolean — must hold AT LEAST ONE
arx.hasRole(userId, role)                     // boolean
```

### Roles

```ts
arx.createRole(name)
arx.createRole(name, { ifExists: 'ignore' })              // no-op if exists
arx.createRole(name, { permissions: ['perm:a', ...] })    // create + grant in one call
arx.deleteRole(name)                                       // idempotent
arx.assignRole(userId, roleName)                           // idempotent
arx.revokeRole(userId, roleName)                           // idempotent
arx.getRoles(userId)                                       // Role[]
arx.getRolePermissions(roleName)                           // Permission[]
```

### Permissions

```ts
arx.createPermission(name)
arx.createPermission(name, { ifExists: 'ignore' })
arx.deletePermission(name)                                 // idempotent
arx.assignPermission(userId, permissionName)               // direct grant, idempotent
arx.revokePermission(userId, permissionName)               // idempotent
arx.grantPermissionToRole(roleName, permissionName)        // idempotent
arx.revokePermissionFromRole(roleName, permissionName)     // idempotent
arx.getPermissions(userId)                                 // effective (direct + roles), deduped
arx.getDirectPermissions(userId)                           // direct grants only
```

### Error types

All errors extend `ArxError` which extends `Error`.

| Class | When thrown | Extra property |
|---|---|---|
| `RoleAlreadyExistsError` | `createRole` with duplicate name | `.roleName` |
| `RoleNotFoundError` | `assignRole`, `grantPermissionToRole` | `.roleName` |
| `PermissionAlreadyExistsError` | `createPermission` with duplicate name | `.permissionName` |
| `PermissionNotFoundError` | `assignPermission`, `grantPermissionToRole` | `.permissionName` |

```ts
import { RoleNotFoundError } from '@arx/core'

try {
  await arx.assignRole(userId, 'ghost')
} catch (err) {
  if (err instanceof RoleNotFoundError) {
    console.log(err.roleName) // 'ghost'
  }
}
```

## Writing a custom adapter

Implement the `StorageAdapter` interface and verify it with the built-in contract test suite:

```ts
// my-adapter/src/adapter.ts
import type { StorageAdapter } from '@arx/core'

export class MyAdapter implements StorageAdapter {
  // ... implement all methods
}
```

```ts
// my-adapter/src/tests/my-adapter.test.ts
import { testStorageAdapterContract } from '@arx/core/testing'
import { MyAdapter } from '../adapter.js'

testStorageAdapterContract({
  create: () => new MyAdapter(),
  reset:  async () => { /* truncate tables */ },
})
```

## In-memory adapter

`InMemoryAdapter` is provided for unit tests and prototyping. It implements the full `StorageAdapter` contract and resets cleanly between tests.

```ts
import { InMemoryAdapter } from '@arx/core'

const arx = createAuthorization({ adapter: new InMemoryAdapter() })
```

## License

MIT
