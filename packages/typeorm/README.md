# @arxjs/typeorm

[TypeORM](https://typeorm.io/) adapter for [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core). Supports any database TypeORM supports — PostgreSQL, MySQL, MariaDB, SQLite, SQL Server, and more.

## Installation

```bash
pnpm add @arxjs/typeorm @arxjs/core typeorm reflect-metadata
# npm install @arxjs/typeorm @arxjs/core typeorm reflect-metadata
```

> **Why `reflect-metadata`?** TypeORM's decorator system requires it. It must be imported once at the very top of your application entry point, before any other imports.

## Setup

### 1. Update your `tsconfig.json`

TypeORM decorators require two compiler options that are off by default:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 2. Register the arx entities in your DataSource

arx provides five entity classes. Use `ARX_TYPEORM_ENTITIES` to register them all at once:

```ts
// data-source.ts
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { ARX_TYPEORM_ENTITIES } from '@arxjs/typeorm'

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...ARX_TYPEORM_ENTITIES],
  migrations: ['src/migrations/*.ts'],
})
```

### 3. Create the arx tables via migrations

> **Do not use `synchronize: true` in production.** TypeORM's `synchronize` option automatically alters your database schema on every startup to match your entity definitions. This can result in data loss if columns are renamed or removed. Use migrations instead.

Generate a migration from the registered entities:

```bash
# Using ts-node
npx typeorm-ts-node-esm migration:generate src/migrations/ArxInit -d src/data-source.ts

# Using ts-node with CommonJS
npx typeorm-ts-node-commonjs migration:generate src/migrations/ArxInit -d src/data-source.ts
```

Then run it:

```bash
npx typeorm-ts-node-esm migration:run -d src/data-source.ts
```

For local development only, you can use `synchronize: true` as a shortcut to skip migrations:

```ts
// Development only — never use in production
new DataSource({
  synchronize: true,
  entities: [...ARX_TYPEORM_ENTITIES],
  // ...
})
```

**NestJS users:** see the [NestJS integration](#nestjs-integration) section for a different setup approach.

### 4. Create the adapter

```ts
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { createAuthorization } from '@arxjs/core'
import { TypeOrmAdapter, ARX_TYPEORM_ENTITIES } from '@arxjs/typeorm'

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...ARX_TYPEORM_ENTITIES],
  migrations: ['src/migrations/*.ts'],
})

await dataSource.initialize()

const arx = createAuthorization({
  adapter: new TypeOrmAdapter(dataSource),
})
```

## Usage

```ts
await arx.createRole('editor', { permissions: ['post:edit', 'post:view'] })
await arx.assignRole('user-1', 'editor')
await arx.can('user-1', 'post:edit') // true
```

See [`@arxjs/core`](https://github.com/lcubas/arxjs/tree/main/packages/core) for the full API reference.

## Tables created

| Table | Description |
|---|---|
| `arx_roles` | Role definitions |
| `arx_permissions` | Permission definitions |
| `arx_role_permissions` | Role → permission grants |
| `arx_user_roles` | User → role assignments |
| `arx_user_permissions` | Direct user → permission grants |

Tables are prefixed with `arx_` to avoid conflicts with your own entities. See the [database schema reference](https://github.com/lcubas/arxjs/tree/main/packages/core#database-schema) in `@arxjs/core` for the full column and constraint details.

## NestJS integration

Use together with [`@arxjs/nestjs`](https://github.com/lcubas/arxjs/tree/main/packages/nestjs) and `@nestjs/typeorm`:

```ts
// app.module.ts
import 'reflect-metadata'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ArxModule } from '@arxjs/nestjs'
import { TypeOrmAdapter, ARX_TYPEORM_ENTITIES } from '@arxjs/typeorm'
import { DataSource } from 'typeorm'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [...ARX_TYPEORM_ENTITIES],
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true, // run pending migrations on startup
    }),
    ArxModule.forRootAsync({
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => ({
        adapter: new TypeOrmAdapter(dataSource),
        getUserId: (req) => (req as { user?: { id?: string } }).user?.id,
      }),
    }),
  ],
})
export class AppModule {}
```

With NestJS, `@nestjs/typeorm` manages the `DataSource` lifecycle. Injecting it via `forRootAsync` is the recommended approach.

## Peer dependencies

| Package | Version |
|---|---|
| `@arxjs/core` | `*` |
| `typeorm` | `>=0.3.0` |

## License

MIT
