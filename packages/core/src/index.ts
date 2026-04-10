/**
 * @arx/core — Modern authorization library for Node.js and TypeScript.
 *
 * ## Quick start
 *
 * ```ts
 * import { createAuthorization } from '@arx/core'
 * import { PrismaAdapter } from '@arx/prisma'
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
export { createAuthorization } from './authorization';
export type { Authorization, AuthorizationConfig } from './authorization';

// Domain entities
export type {
  Permission,
  PermissionAssignment,
  Role,
  RoleAssignment,
  RolePermissionAssignment,
} from './types';

// Errors
export {
  ArxError,
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors';

// Adapter contract
export type { StorageAdapter } from './adapter';

// Operation options
export type { CreatePermissionOptions, CreateRoleOptions } from './engine';

// Testing adapter
export { InMemoryAdapter } from './in-memory-adapter';
