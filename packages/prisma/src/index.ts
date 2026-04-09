/**
 * @arx/prisma — Prisma adapter for the arx authorization library.
 *
 * ## Quick start
 *
 * ```ts
 * import { PrismaClient } from '@prisma/client'
 * import { createAuthorization } from '@arx/core'
 * import { PrismaAdapter } from '@arx/prisma'
 *
 * const prisma = new PrismaClient()
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new PrismaAdapter(prisma),
 * })
 *
 * await createRole('editor', { permissions: ['edit:post', 'view:post'] })
 * await assignRole('user-1', 'editor')
 *
 * const allowed = await can('user-1', 'edit:post') // true
 * ```
 *
 * @packageDocumentation
 */

export { PrismaAdapter } from './adapter';
export type { PrismaClientForArx } from './adapter';
