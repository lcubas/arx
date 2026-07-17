/**
 * @arxjs/core — Modern authorization library for Node.js and TypeScript.
 *
 * ## Quick start
 *
 * ```ts
 * import { createAuthorization } from '@arxjs/core'
 * import { PrismaAdapter } from '@arxjs/prisma'
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

// Adapter contract
export type { StorageAdapter } from './adapter';
export type { Authorization, AuthorizationConfig } from './authorization';
export { createAuthorization } from './authorization';
// Operation options
export type { CreatePermissionOptions, CreateRoleOptions } from './engine';
// Errors
export {
  ArxError,
  InvalidNameError,
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors';
// Testing adapter
export { InMemoryAdapter } from './in-memory-adapter';
// Domain entities
export type {
  Permission,
  PermissionAssignment,
  Role,
  RoleAssignment,
  RolePermissionAssignment,
} from './types';
