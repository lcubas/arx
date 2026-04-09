import type { Permission, Role } from './types';

/**
 * The storage adapter contract — the port that decouples the arx
 * authorization engine from any specific ORM or database.
 *
 * Every ORM adapter (@arx/prisma, @arx/drizzle, etc.) must implement
 * this interface. The engine calls only these methods and never imports
 * from any ORM package directly.
 *
 * ## Naming convention
 *
 * All role and permission references use **names** (strings), not IDs.
 * Names are the stable, human-readable identifiers that developers work
 * with at the call site. Adapters are responsible for translating names
 * into whatever primary keys the underlying schema uses internally.
 *
 * ## Idempotency
 *
 * Revoke and unassign operations are **idempotent**: calling them when
 * the assignment does not exist is a no-op, never an error.
 *
 * Grant and assign operations are also **idempotent**: reassigning an
 * already-held role or permission has no effect.
 *
 * ## Error contract
 *
 * Methods that require an entity to exist before operating on it
 * (e.g. `grantPermissionToRole`) throw the appropriate typed error
 * (`RoleNotFoundError`, `PermissionNotFoundError`) if the entity is
 * missing. See `@arx/core` error classes for the full list.
 */
export interface StorageAdapter {
  // ─── Roles ─────────────────────────────────────────────────────────────────

  /**
   * Create a new role with the given name.
   * @throws {RoleAlreadyExistsError} if a role with this name already exists.
   */
  createRole(name: string): Promise<Role>;

  /**
   * Find a role by name.
   * @returns The role, or `null` if it does not exist.
   */
  findRole(name: string): Promise<Role | null>;

  /**
   * Delete a role by name.
   * Also removes all assignments that reference this role.
   * No-op if the role does not exist.
   */
  deleteRole(name: string): Promise<void>;

  // ─── Permissions ───────────────────────────────────────────────────────────

  /**
   * Create a new permission with the given name.
   * @throws {PermissionAlreadyExistsError} if it already exists.
   */
  createPermission(name: string): Promise<Permission>;

  /**
   * Find a permission by name.
   * @returns The permission, or `null` if it does not exist.
   */
  findPermission(name: string): Promise<Permission | null>;

  /**
   * Delete a permission by name.
   * Also removes all assignments that reference this permission.
   * No-op if the permission does not exist.
   */
  deletePermission(name: string): Promise<void>;

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  /**
   * Grant a permission to a role. Idempotent.
   * @throws {RoleNotFoundError} if the role does not exist.
   * @throws {PermissionNotFoundError} if the permission does not exist.
   */
  grantPermissionToRole(roleName: string, permissionName: string): Promise<void>;

  /**
   * Revoke a permission from a role. Idempotent — no-op if not granted.
   */
  revokePermissionFromRole(roleName: string, permissionName: string): Promise<void>;

  /**
   * Get all permissions assigned to a role.
   * @returns An empty array if the role has no permissions (or does not exist).
   */
  getPermissionsForRole(roleName: string): Promise<Permission[]>;

  // ─── User ↔ Role ───────────────────────────────────────────────────────────

  /**
   * Assign a role to a user. Idempotent.
   * @throws {RoleNotFoundError} if the role does not exist.
   */
  assignRoleToUser(userId: string, roleName: string): Promise<void>;

  /**
   * Revoke a role from a user. Idempotent — no-op if not assigned.
   */
  revokeRoleFromUser(userId: string, roleName: string): Promise<void>;

  /**
   * Get all roles assigned to a user.
   * @returns An empty array if the user has no roles.
   */
  getRolesForUser(userId: string): Promise<Role[]>;

  // ─── User ↔ Permission (direct) ────────────────────────────────────────────

  /**
   * Grant a permission directly to a user (not via a role). Idempotent.
   * @throws {PermissionNotFoundError} if the permission does not exist.
   */
  grantPermissionToUser(userId: string, permissionName: string): Promise<void>;

  /**
   * Revoke a direct permission from a user. Idempotent — no-op if not granted.
   */
  revokePermissionFromUser(userId: string, permissionName: string): Promise<void>;

  /**
   * Get permissions granted directly to a user (not inherited via roles).
   * @returns An empty array if the user has no direct permissions.
   */
  getDirectPermissionsForUser(userId: string): Promise<Permission[]>;

  // ─── Optional optimization ─────────────────────────────────────────────────

  /**
   * Get all effective permissions for a user — both inherited from roles
   * and granted directly.
   *
   * This method is **optional**. When implemented, the engine uses it
   * for `can()` checks instead of composing individual lookups, allowing
   * the adapter to resolve everything in a single optimized query.
   *
   * Implementations must deduplicate: if the same permission is granted
   * via a role and directly, it should appear only once in the result.
   */
  getEffectivePermissions?(userId: string): Promise<Permission[]>;
}
