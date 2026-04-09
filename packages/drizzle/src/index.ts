/**
 * @arx/drizzle — Drizzle ORM adapter for the arx authorization library.
 *
 * ## Quick start
 *
 * ```ts
 * import { drizzle } from 'drizzle-orm/postgres-js'
 * import postgres from 'postgres'
 * import { createAuthorization } from '@arx/core'
 * import { DrizzleAdapter } from '@arx/drizzle'
 * import { schema } from '@arx/drizzle/schema/pg'
 *
 * const db = drizzle(postgres(process.env.DATABASE_URL))
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new DrizzleAdapter(db, schema),
 * })
 *
 * await createRole('editor', { permissions: ['edit:post', 'view:post'] })
 * await assignRole('user-1', 'editor')
 *
 * const allowed = await can('user-1', 'edit:post') // true
 * ```
 *
 * Import the schema that matches your database dialect:
 * - PostgreSQL → `@arx/drizzle/schema/pg`
 * - MySQL      → `@arx/drizzle/schema/mysql`
 * - SQLite     → `@arx/drizzle/schema/sqlite`
 *
 * @packageDocumentation
 */

export { DrizzleAdapter } from './adapter.js';
export type { ArxDrizzleSchema } from './adapter.js';
