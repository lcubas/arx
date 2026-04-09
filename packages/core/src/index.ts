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

// ─── Primary entry point ───────────────────────────────────────────────────
export { createAuthorization } from './authorization.js';
export type { Authorization, AuthorizationConfig } from './authorization.js';

// ─── Domain entities ───────────────────────────────────────────────────────
export type {
  Permission,
  PermissionAssignment,
  Role,
  RoleAssignment,
  RolePermissionAssignment,
} from './types.js';

// ─── Errors ────────────────────────────────────────────────────────────────
export {
  ArxError,
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors.js';

// ─── Adapter contract ──────────────────────────────────────────────────────
export type { StorageAdapter } from './adapter.js';

// ─── Operation options ─────────────────────────────────────────────────────
export type { CreatePermissionOptions, CreateRoleOptions } from './engine.js';

// ─── Testing adapter ───────────────────────────────────────────────────────
export { InMemoryAdapter } from './in-memory-adapter.js';
