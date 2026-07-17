# @arxjs/nestjs

NestJS module for [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core). Provides an injectable `ArxService`, a route guard, and declarative decorators for permission and role checks.

## Installation

```bash
pnpm add @arxjs/nestjs @arxjs/core
# npm install @arxjs/nestjs @arxjs/core
```

Install a storage adapter:

```bash
pnpm add @arxjs/prisma    # Prisma
pnpm add @arxjs/drizzle   # Drizzle ORM
pnpm add @arxjs/typeorm   # TypeORM (also requires: typeorm reflect-metadata)
```

## Setup

Register `ArxModule` once in your root `AppModule`. It is global by default, so you only need to import it once.

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { ArxModule } from '@arxjs/nestjs'
import { PrismaAdapter } from '@arxjs/prisma'
import { PrismaService } from './prisma.service'

@Module({
  imports: [
    ArxModule.forRoot({
      adapter: new PrismaAdapter(prisma),
      getUserId: (req) => req.user?.id,
    }),
  ],
})
export class AppModule {}
```

### Async configuration

Use `forRootAsync` when the adapter depends on other services (e.g. `PrismaService`, `DataSource`, `ConfigService`):

```ts
ArxModule.forRootAsync({
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => ({
    adapter: new PrismaAdapter(prisma),
    getUserId: (req) => req.user?.id,
  }),
})
```

### Setup with TypeORM

When using `@arxjs/typeorm`, the `DataSource` is managed by `@nestjs/typeorm` — inject it via `forRootAsync`:

```bash
pnpm add @arxjs/typeorm @nestjs/typeorm typeorm reflect-metadata
```

```ts
// app.module.ts
import 'reflect-metadata'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_GUARD } from '@nestjs/core'
import { ArxModule, ArxGuard } from '@arxjs/nestjs'
import { TypeOrmAdapter, ARX_TYPEORM_ENTITIES } from '@arxjs/typeorm'
import { DataSource } from 'typeorm'

@Module({
  imports: [
    // 1. Set up TypeORM with the arx entities
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [...ARX_TYPEORM_ENTITIES],
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true, // run pending migrations automatically on startup
    }),

    // 2. Register ArxModule — inject DataSource managed by @nestjs/typeorm
    ArxModule.forRootAsync({
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => ({
        adapter: new TypeOrmAdapter(dataSource),
        getUserId: (req) => (req as { user?: { id?: string } }).user?.id,
      }),
    }),
  ],
  providers: [
    // 3. (Optional) protect every route globally
    { provide: APP_GUARD, useExisting: ArxGuard },
  ],
})
export class AppModule {}
```

From here, everything works the same as with any other adapter — use `@RequirePermissions`, `@RequireRole`, and `ArxService` as shown below.

### `getUserId`

The `getUserId` function receives the raw HTTP request object and must return the current user's ID as a string, or `undefined` if the user is not authenticated.

```ts
// Passport / JWT (request.user populated by a JwtAuthGuard)
getUserId: (req) => req.user?.id

// Custom header
getUserId: (req) => req.headers['x-user-id'] as string | undefined
```

When `getUserId` returns `undefined` on a route protected by `@RequirePermissions` or `@RequireRole`, the guard throws `UnauthorizedException` (HTTP 401).

## Protecting routes

Apply `@RequirePermissions()` or `@RequireRole()` to your controllers or handlers, then add `ArxGuard` to enforce them.

```ts
// posts.controller.ts
import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common'
import { ArxGuard, RequirePermissions, RequireRole } from '@arxjs/nestjs'

@Controller('posts')
@UseGuards(ArxGuard)
export class PostsController {

  @Get()
  @RequirePermissions('post:view')
  findAll() { ... }

  @Post()
  @RequirePermissions('post:create')
  create() { ... }

  @Delete(':id')
  @RequirePermissions('post:delete')
  remove() { ... }

  @Post('bulk-delete')
  @RequireRole('admin', 'moderator')   // any one of these roles is sufficient
  bulkDelete() { ... }
}
```

### Decorator semantics

| Decorator | Logic |
|---|---|
| `@RequirePermissions('a', 'b')` | User must hold **all** listed permissions (AND) |
| `@RequireRole('admin', 'mod')` | User must hold **at least one** listed role (OR) |

Handler-level decorators take precedence over controller-level ones when both are present.

### Global guard

To protect every route in the application without adding `@UseGuards(ArxGuard)` to every controller:

```ts
// app.module.ts
import { APP_GUARD } from '@nestjs/core'
import { ArxGuard } from '@arxjs/nestjs'

@Module({
  providers: [
    { provide: APP_GUARD, useExisting: ArxGuard },
  ],
})
export class AppModule {}
```

> **Important:** routes without `@RequirePermissions` or `@RequireRole` are **allowed through** even with the global guard active. This means your public routes (e.g. login, health check) require no extra work — the guard only enforces routes that have one of the decorators. If you want a route to be explicitly public and self-documenting, you can omit the decorators — it will pass through automatically.

## Programmatic checks

Inject `ArxService` for imperative permission checks inside services, guards, or resolvers:

```ts
// posts.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common'
import { ArxService } from '@arxjs/nestjs'

@Injectable()
export class PostsService {
  constructor(private readonly arx: ArxService) {}

  async publish(userId: string, postId: string) {
    const canPublish = await this.arx.can(userId, 'post:publish')
    if (!canPublish) throw new ForbiddenException()
    // ...
  }
}
```

`ArxService` exposes the full `@arxjs/core` API — see [`@arxjs/core` docs](https://github.com/lcubas/arxjs/tree/main/packages/core#api) for the complete reference.

## Peer dependencies

| Package | Version |
|---|---|
| `@arxjs/core` | `*` |
| `@nestjs/common` | `>=10.0.0` |
| `@nestjs/core` | `>=10.0.0` |
| `reflect-metadata` | `>=0.1.12` |

## License

MIT
