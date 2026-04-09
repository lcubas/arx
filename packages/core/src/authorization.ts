import type { StorageAdapter } from './adapter';
import {
  AuthorizationEngine,
  type CreatePermissionOptions,
  type CreateRoleOptions,
} from './engine';
import type { Permission, Role } from './types';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Configuration for `createAuthorization`.
 */
export interface AuthorizationConfig {
  /**
   * The storage adapter responsible for persisting and retrieving
   * authorization data. Use `@arx/prisma`, `@arx/drizzle`, or any
   * custom implementation of `StorageAdapter`.
   *
   * For testing, use `InMemoryAdapter` from `@arx/core`.
   */
  adapter: StorageAdapter;
}

// ─── Public API surface ───────────────────────────────────────────────────────

/**
 * The authorization object returned by `createAuthorization`.
 *
 * Destructure the functions you need — they are all independently
 * tree-shakeable when bundled.
 *
 * @example
 * const { can, assignRole, createRole } = createAuthorization({ adapter })
 */
export interface Authorization {
  // ─── Checks ──────────────────────────────────────────────────────────────

  /**
   * Check whether a user holds a specific permission.
   * Includes permissions inherited via roles and those granted directly.
   * Returns `false` for a permission that does not exist in storage.
   *
   * @example
   * const allowed = await can('user-1', 'edit:post')
   */
  can(userId: string, permissionName: string): Promise<boolean>;

  /**
   * Check whether a user holds **all** of the specified permissions.
   * Returns `true` for an empty array.
   *
   * @example
   * const allowed = await canAll('user-1', ['edit:post', 'delete:post'])
   */
  canAll(userId: string, permissionNames: readonly string[]): Promise<boolean>;

  /**
   * Check whether a user holds **at least one** of the specified permissions.
   * Returns `false` for an empty array.
   *
   * @example
   * const allowed = await canAny('user-1', ['publish:post', 'edit:post'])
   */
  canAny(userId: string, permissionNames: readonly string[]): Promise<boolean>;

  /**
   * Check whether a user has been assigned a specific role.
   *
   * @example
   * const isAdmin = await hasRole('user-1', 'admin')
   */
  hasRole(userId: string, roleName: string): Promise<boolean>;

  // ─── Role management ───────────────────────────────────────────────────────

  /**
   * Create a new role.
   *
   * @example
   * await createRole('editor', {
   *   permissions: ['edit:post', 'view:post'],
   * })
   *
   * // Idempotent — safe to call in seeds or setup scripts
   * await createRole('admin', { ifExists: 'ignore' })
   */
  createRole(name: string, options?: CreateRoleOptions): Promise<Role>;

  /**
   * Delete a role and remove all its assignments.
   * No-op if the role does not exist.
   */
  deleteRole(name: string): Promise<void>;

  /**
   * Get all roles currently assigned to a user.
   */
  getRoles(userId: string): Promise<Role[]>;

  /**
   * Assign a role to a user.
   * @throws {RoleNotFoundError} if the role does not exist.
   *
   * @example
   * await assignRole('user-1', 'editor')
   */
  assignRole(userId: string, roleName: string): Promise<void>;

  /**
   * Revoke a role from a user.
   * Idempotent — no-op if the user does not hold the role.
   */
  revokeRole(userId: string, roleName: string): Promise<void>;

  // ─── Permission management ─────────────────────────────────────────────────

  /**
   * Create a new permission.
   *
   * @example
   * await createPermission('edit:post')
   * await createPermission('edit:post', { ifExists: 'ignore' })
   */
  createPermission(name: string, options?: CreatePermissionOptions): Promise<Permission>;

  /**
   * Delete a permission and remove all its assignments.
   * No-op if the permission does not exist.
   */
  deletePermission(name: string): Promise<void>;

  /**
   * Get all effective permissions for a user.
   * Includes permissions inherited via roles and those granted directly.
   * The result is deduplicated. Order is not guaranteed.
   */
  getPermissions(userId: string): Promise<Permission[]>;

  /**
   * Get only the permissions granted directly to a user — not via roles.
   */
  getDirectPermissions(userId: string): Promise<Permission[]>;

  /**
   * Grant a permission directly to a user (not via a role).
   * @throws {PermissionNotFoundError} if the permission does not exist.
   *
   * @example
   * await assignPermission('user-1', 'publish:post')
   */
  assignPermission(userId: string, permissionName: string): Promise<void>;

  /**
   * Revoke a directly-granted permission from a user.
   * Idempotent — no-op if not held directly.
   * Does not affect permissions inherited via roles.
   */
  revokePermission(userId: string, permissionName: string): Promise<void>;

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  /**
   * Grant a permission to a role.
   * @throws {RoleNotFoundError} if the role does not exist.
   * @throws {PermissionNotFoundError} if the permission does not exist.
   *
   * @example
   * await grantPermissionToRole('editor', 'edit:post')
   */
  grantPermissionToRole(roleName: string, permissionName: string): Promise<void>;

  /**
   * Revoke a permission from a role.
   * Idempotent — no-op if the role does not hold the permission.
   */
  revokePermissionFromRole(roleName: string, permissionName: string): Promise<void>;

  /**
   * Get all permissions currently granted to a role.
   */
  getRolePermissions(roleName: string): Promise<Permission[]>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an authorization instance bound to the given adapter.
 *
 * This is the primary entry point for arx. Call it once at application startup
 * and share the returned object (or its destructured functions) across your app.
 *
 * @example
 * // Basic setup
 * import { createAuthorization } from '@arx/core'
 * import { PrismaAdapter } from '@arx/prisma'
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new PrismaAdapter(prisma),
 * })
 *
 * @example
 * // Testing setup
 * import { createAuthorization, InMemoryAdapter } from '@arx/core'
 *
 * const adapter = new InMemoryAdapter()
 * const auth = createAuthorization({ adapter })
 * afterEach(() => adapter.reset())
 */
export function createAuthorization(config: AuthorizationConfig): Authorization {
  const engine = new AuthorizationEngine(config.adapter);

  return {
    // Checks
    can: (userId, permissionName) => engine.can(userId, permissionName),
    canAll: (userId, permissionNames) => engine.canAll(userId, permissionNames),
    canAny: (userId, permissionNames) => engine.canAny(userId, permissionNames),
    hasRole: (userId, roleName) => engine.hasRole(userId, roleName),

    // Role management
    createRole: (name, options) => engine.createRole(name, options),
    deleteRole: (name) => engine.deleteRole(name),
    getRoles: (userId) => engine.getRoles(userId),
    assignRole: (userId, roleName) => engine.assignRole(userId, roleName),
    revokeRole: (userId, roleName) => engine.revokeRole(userId, roleName),

    // Permission management
    createPermission: (name, options) => engine.createPermission(name, options),
    deletePermission: (name) => engine.deletePermission(name),
    getPermissions: (userId) => engine.getPermissions(userId),
    getDirectPermissions: (userId) => engine.getDirectPermissions(userId),
    assignPermission: (userId, permissionName) => engine.assignPermission(userId, permissionName),
    revokePermission: (userId, permissionName) => engine.revokePermission(userId, permissionName),

    // Role ↔ Permission
    grantPermissionToRole: (roleName, permissionName) =>
      engine.grantPermissionToRole(roleName, permissionName),
    revokePermissionFromRole: (roleName, permissionName) =>
      engine.revokePermissionFromRole(roleName, permissionName),
    getRolePermissions: (roleName) => engine.getRolePermissions(roleName),
  };
}
