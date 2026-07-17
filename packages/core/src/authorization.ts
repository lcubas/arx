import type { StorageAdapter } from './adapter';
import {
  AuthorizationEngine,
  type CreatePermissionOptions,
  type CreateRoleOptions,
} from './engine';
import type { Permission, Role } from './types';

/**
 * Configuration for `createAuthorization`.
 */
export interface AuthorizationConfig {
  /**
   * The storage adapter responsible for persisting and retrieving
   * authorization data. Use `@arxjs/prisma`, `@arxjs/drizzle`, or any
   * custom implementation of `StorageAdapter`.
   *
   * For testing, use `InMemoryAdapter` from `@arxjs/core`.
   */
  adapter: StorageAdapter;
}

/**
 * The authorization object returned by `createAuthorization`.
 *
 * Destructure the functions you need — they are all independently
 * tree-shakeable when bundled.
 *
 * Both type parameters are optional. Pass them to get autocomplete and
 * compile-time typo checking for the permission/role vocabulary you define —
 * see `createAuthorization`'s docs for an example. Without them, names are
 * plain `string`, exactly like before.
 *
 * @example
 * const { can, assignRole, createRole } = createAuthorization({ adapter })
 */
export interface Authorization<TPermission extends string = string, TRole extends string = string> {
  // ─── Checks ──────────────────────────────────────────────────────────────

  /**
   * Check whether a user holds a specific permission.
   * Includes permissions inherited via roles and those granted directly.
   * Returns `false` for a permission that does not exist in storage.
   *
   * @example
   * const allowed = await can('user-1', 'edit:post')
   */
  can(userId: string, permissionName: TPermission): Promise<boolean>;

  /**
   * Check whether a user holds **all** of the specified permissions.
   * Returns `true` for an empty array.
   *
   * @example
   * const allowed = await canAll('user-1', ['edit:post', 'delete:post'])
   */
  canAll(userId: string, permissionNames: readonly TPermission[]): Promise<boolean>;

  /**
   * Check whether a user holds **at least one** of the specified permissions.
   * Returns `false` for an empty array.
   *
   * @example
   * const allowed = await canAny('user-1', ['publish:post', 'edit:post'])
   */
  canAny(userId: string, permissionNames: readonly TPermission[]): Promise<boolean>;

  /**
   * Check whether a user has been assigned a specific role.
   *
   * @example
   * const isAdmin = await hasRole('user-1', 'admin')
   */
  hasRole(userId: string, roleName: TRole): Promise<boolean>;

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
  createRole(name: TRole, options?: CreateRoleOptions<TPermission>): Promise<Role>;

  /**
   * Delete a role and remove all its assignments.
   * No-op if the role does not exist.
   */
  deleteRole(name: TRole): Promise<void>;

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
  assignRole(userId: string, roleName: TRole): Promise<void>;

  /**
   * Revoke a role from a user.
   * Idempotent — no-op if the user does not hold the role.
   */
  revokeRole(userId: string, roleName: TRole): Promise<void>;

  // ─── Permission management ─────────────────────────────────────────────────

  /**
   * Create a new permission.
   *
   * @example
   * await createPermission('edit:post')
   * await createPermission('edit:post', { ifExists: 'ignore' })
   */
  createPermission(name: TPermission, options?: CreatePermissionOptions): Promise<Permission>;

  /**
   * Delete a permission and remove all its assignments.
   * No-op if the permission does not exist.
   */
  deletePermission(name: TPermission): Promise<void>;

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
  assignPermission(userId: string, permissionName: TPermission): Promise<void>;

  /**
   * Revoke a directly-granted permission from a user.
   * Idempotent — no-op if not held directly.
   * Does not affect permissions inherited via roles.
   */
  revokePermission(userId: string, permissionName: TPermission): Promise<void>;

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  /**
   * Grant a permission to a role.
   * @throws {RoleNotFoundError} if the role does not exist.
   * @throws {PermissionNotFoundError} if the permission does not exist.
   *
   * @example
   * await grantPermissionToRole('editor', 'edit:post')
   */
  grantPermissionToRole(roleName: TRole, permissionName: TPermission): Promise<void>;

  /**
   * Revoke a permission from a role.
   * Idempotent — no-op if the role does not hold the permission.
   */
  revokePermissionFromRole(roleName: TRole, permissionName: TPermission): Promise<void>;

  /**
   * Get all permissions currently granted to a role.
   */
  getRolePermissions(roleName: TRole): Promise<Permission[]>;
}

/**
 * Create an authorization instance bound to the given adapter.
 *
 * This is the primary entry point for arx. Call it once at application startup
 * and share the returned object (or its destructured functions) across your app.
 *
 * @example
 * // Basic setup
 * import { createAuthorization } from '@arxjs/core'
 * import { PrismaAdapter } from '@arxjs/prisma'
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new PrismaAdapter(prisma),
 * })
 *
 * @example
 * // Typed permission/role vocabulary — optional, and fully backwards
 * // compatible (both type parameters default to `string`). Gets you
 * // autocomplete and a compile error on typos instead of a silent `false`
 * // at runtime.
 * type Permission = 'edit:post' | 'view:post' | 'user:manage'
 * type Role = 'admin' | 'editor' | 'viewer'
 *
 * const auth = createAuthorization<Permission, Role>({
 *   adapter: new PrismaAdapter(prisma),
 * })
 *
 * await auth.can('user-1', 'edit:post') // ✅
 * await auth.can('user-1', 'edti:post') // ❌ compile error
 *
 * @example
 * // Testing setup
 * import { createAuthorization, InMemoryAdapter } from '@arxjs/core'
 *
 * const adapter = new InMemoryAdapter()
 * const auth = createAuthorization({ adapter })
 * afterEach(() => adapter.reset())
 */
export function createAuthorization<
  TPermission extends string = string,
  TRole extends string = string,
>(config: AuthorizationConfig): Authorization<TPermission, TRole> {
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

    // Role - Permission
    grantPermissionToRole: (roleName, permissionName) =>
      engine.grantPermissionToRole(roleName, permissionName),
    revokePermissionFromRole: (roleName, permissionName) =>
      engine.revokePermissionFromRole(roleName, permissionName),
    getRolePermissions: (roleName) => engine.getRolePermissions(roleName),
  };
}
