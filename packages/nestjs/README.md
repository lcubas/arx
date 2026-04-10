# @arx/nestjs

NestJS module for [`@arx/core`](https://github.com/your-org/arx/tree/main/packages/core). Provides an injectable `ArxService`, a route guard, and declarative decorators for permission and role checks.

## Installation

```bash
pnpm add @arx/nestjs @arx/core
# npm install @arx/nestjs @arx/core
```

Install your storage adapter of choice:

```bash
pnpm add @arx/prisma   # or @arx/drizzle
```

## Setup

Register `ArxModule` once in your root `AppModule`. It is global by default.

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { ArxModule } from '@arx/nestjs'
import { PrismaAdapter } from '@arx/prisma'
import { PrismaService } from './prisma.service'

@Module({
  imports: [
    ArxModule.forRoot({
      adapter: new PrismaAdapter(prisma),
      getUserId: (req) => req.user?.id,  // adapt to your auth strategy
    }),
  ],
})
export class AppModule {}
```

Async configuration (e.g. when the adapter depends on `ConfigService`):

```ts
ArxModule.forRootAsync({
  inject: [ConfigService, PrismaService],
  useFactory: (config: ConfigService, prisma: PrismaService) => ({
    adapter: new PrismaAdapter(prisma),
    getUserId: (req) => req.user?.id,
  }),
})
```

## Declarative guards

Apply `@RequirePermissions()` or `@RequireRole()` to protect routes, then add `ArxGuard` to your controller or register it globally.

```ts
// posts.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ArxGuard, RequirePermissions, RequireRole } from '@arx/nestjs'

@Controller('posts')
@UseGuards(ArxGuard)
export class PostsController {

  @Get()
  @RequirePermissions('post:view')
  findAll() { ... }

  @Post()
  @RequirePermissions('post:create')
  create() { ... }

  @Post('bulk-delete')
  @RequireRole('admin', 'moderator')  // any one of these roles
  bulkDelete() { ... }
}
```

**Global guard** — protect every route in the application at once:

```ts
// app.module.ts
import { APP_GUARD } from '@nestjs/core'
import { ArxGuard } from '@arx/nestjs'

providers: [{ provide: APP_GUARD, useClass: ArxGuard }]
```

Routes without either decorator are allowed through, so you can opt-in per route.

## Programmatic checks

Inject `ArxService` for imperative permission checks inside services or resolvers:

```ts
// posts.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common'
import { ArxService } from '@arx/nestjs'

@Injectable()
export class PostsService {
  constructor(private readonly arx: ArxService) {}

  async publish(userId: string, postId: string) {
    if (!await this.arx.can(userId, 'post:publish')) {
      throw new ForbiddenException()
    }
    // ...
  }
}
```

`ArxService` exposes the full `@arx/core` API — see [`@arx/core` docs](https://github.com/your-org/arx/tree/main/packages/core#api) for the complete reference.

## getUserId

The `getUserId` function receives the raw Express/Fastify request object and must return the current user's ID as a string, or `undefined` if the user is not authenticated. When `undefined` is returned on a guarded route, the guard throws `UnauthorizedException`.

```ts
// Passport JWT (request.user populated by JwtAuthGuard)
getUserId: (req) => req.user?.id

// Custom header
getUserId: (req) => req.headers['x-user-id'] as string | undefined
```

## Decorator semantics

| Decorator | Logic |
|---|---|
| `@RequirePermissions('a', 'b')` | User must hold **all** listed permissions |
| `@RequireRole('admin', 'mod')` | User must hold **at least one** of the listed roles |

Handler-level decorators take precedence over controller-level ones (`reflector.getAllAndOverride`).

## Peer dependencies

| Package | Version |
|---|---|
| `@arx/core` | `*` |
| `@nestjs/common` | `>=10.0.0` |
| `@nestjs/core` | `>=10.0.0` |
| `reflect-metadata` | `>=0.1.12` |

## License

MIT
