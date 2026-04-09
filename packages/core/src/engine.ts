import type { StorageAdapter } from './adapter';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors';
import type { Permission, Role } from './types';

// ─── Option types (public — appear in the createAuthorization API) ────────────

export interface CreateRoleOptions {
  /**
   * What to do if the role already exists.
   * - `'throw'` (default): throw `RoleAlreadyExistsError`.
   * - `'ignore'`: return the existing role silently.
   */
  ifExists?: 'throw' | 'ignore';
  /**
   * Permission names to grant to this role immediately after creation.
   * Throws `PermissionNotFoundError` if any permission does not exist.
   */
  permissions?: string[];
}

export interface CreatePermissionOptions {
  /**
   * What to do if the permission already exists.
   * - `'throw'` (default): throw `PermissionAlreadyExistsError`.
   * - `'ignore'`: return the existing permission silently.
   */
  ifExists?: 'throw' | 'ignore';
}

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * The authorization engine.
 *
 * Contains all authorization logic. It is the only place in the system
 * that decides whether a user `can()` perform an action. It orchestrates
 * calls to the `StorageAdapter` and never imports from any ORM package.
 *
 * Not exported from the public API — consumers use `createAuthorization`,
 * which creates an engine and exposes its methods as bound functions.
 */
export class AuthorizationEngine {
  constructor(private readonly adapter: StorageAdapter) {}

  // ─── Permission checks ─────────────────────────────────────────────────────

  /**
   * Check whether a user has a specific permission.
   *
   * The check includes permissions inherited via roles and permissions
   * granted directly. Returns `false` if the permission does not exist
   * in storage — never throws for missing permissions.
   *
   * Uses the adapter's `getEffectivePermissions` optimized path when
   * available. Falls back to composed individual lookups otherwise.
   */
  async can(userId: string, permissionName: string): Promise<boolean> {
    // Fast path — adapter handles resolution in a single query
    if (this.adapter.getEffectivePermissions) {
      const perms = await this.adapter.getEffectivePermissions(userId);
      return perms.some((p) => p.name === permissionName);
    }

    // Standard path — check direct permissions first (early exit)
    const directPerms = await this.adapter.getDirectPermissionsForUser(userId);
    if (directPerms.some((p) => p.name === permissionName)) return true;

    // Then walk role-inherited permissions (early exit per role)
    const roles = await this.adapter.getRolesForUser(userId);
    for (const role of roles) {
      const rolePerms = await this.adapter.getPermissionsForRole(role.name);
      if (rolePerms.some((p) => p.name === permissionName)) return true;
    }

    return false;
  }

  /**
   * Check whether a user has **all** of the specified permissions.
   * Returns `true` for an empty array (vacuous truth).
   */
  async canAll(userId: string, permissionNames: readonly string[]): Promise<boolean> {
    if (permissionNames.length === 0) return true;
    const effective = await this.resolveEffectivePermissionNames(userId);
    return permissionNames.every((name) => effective.has(name));
  }

  /**
   * Check whether a user has **at least one** of the specified permissions.
   * Returns `false` for an empty array.
   */
  async canAny(userId: string, permissionNames: readonly string[]): Promise<boolean> {
    if (permissionNames.length === 0) return false;
    const effective = await this.resolveEffectivePermissionNames(userId);
    return permissionNames.some((name) => effective.has(name));
  }

  /**
   * Check whether a user has been assigned a specific role.
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await this.adapter.getRolesForUser(userId);
    return roles.some((r) => r.name === roleName);
  }

  // ─── Role management ───────────────────────────────────────────────────────

  /**
   * Create a new role.
   *
   * Pass `options.ifExists = 'ignore'` to suppress `RoleAlreadyExistsError`
   * and return the existing role instead.
   *
   * Pass `options.permissions` to grant permissions to the role immediately
   * after creation, in a single operation.
   */
  async createRole(name: string, options?: CreateRoleOptions): Promise<Role> {
    const existing = await this.adapter.findRole(name);

    if (existing) {
      if (options?.ifExists === 'ignore') return existing;
      throw new RoleAlreadyExistsError(name);
    }

    const role = await this.adapter.createRole(name);

    if (options?.permissions && options.permissions.length > 0) {
      await Promise.all(
        options.permissions.map((perm) => this.adapter.grantPermissionToRole(name, perm)),
      );
    }

    return role;
  }

  /**
   * Delete a role by name.
   * All user-role and role-permission assignments are removed automatically.
   * No-op if the role does not exist.
   */
  async deleteRole(name: string): Promise<void> {
    await this.adapter.deleteRole(name);
  }

  /**
   * Get all roles currently assigned to a user.
   */
  async getRoles(userId: string): Promise<Role[]> {
    return this.adapter.getRolesForUser(userId);
  }

  /**
   * Assign a role to a user.
   * @throws {RoleNotFoundError} if the role does not exist.
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await this.adapter.findRole(roleName);
    if (!role) throw new RoleNotFoundError(roleName);
    await this.adapter.assignRoleToUser(userId, roleName);
  }

  /**
   * Revoke a role from a user. Idempotent — no-op if the user does not hold the role.
   */
  async revokeRole(userId: string, roleName: string): Promise<void> {
    await this.adapter.revokeRoleFromUser(userId, roleName);
  }

  // ─── Permission management ─────────────────────────────────────────────────

  /**
   * Create a new permission.
   *
   * Pass `options.ifExists = 'ignore'` to suppress `PermissionAlreadyExistsError`
   * and return the existing permission instead.
   */
  async createPermission(name: string, options?: CreatePermissionOptions): Promise<Permission> {
    const existing = await this.adapter.findPermission(name);

    if (existing) {
      if (options?.ifExists === 'ignore') return existing;
      throw new PermissionAlreadyExistsError(name);
    }

    return this.adapter.createPermission(name);
  }

  /**
   * Delete a permission by name.
   * All assignments referencing this permission are removed automatically.
   * No-op if the permission does not exist.
   */
  async deletePermission(name: string): Promise<void> {
    await this.adapter.deletePermission(name);
  }

  /**
   * Get all effective permissions for a user.
   * Includes permissions inherited via roles and those granted directly.
   * The result is deduplicated — each permission appears at most once.
   * Order is not guaranteed.
   */
  async getPermissions(userId: string): Promise<Permission[]> {
    if (this.adapter.getEffectivePermissions) {
      return this.adapter.getEffectivePermissions(userId);
    }

    const [roles, directPerms] = await Promise.all([
      this.adapter.getRolesForUser(userId),
      this.adapter.getDirectPermissionsForUser(userId),
    ]);

    const seen = new Set<string>();
    const result: Permission[] = [];

    const collect = (p: Permission) => {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        result.push(p);
      }
    };

    directPerms.forEach(collect);

    // Role permissions are fetched in parallel then merged
    const rolePermsArrays = await Promise.all(
      roles.map((role) => this.adapter.getPermissionsForRole(role.name)),
    );
    for (const rolePerms of rolePermsArrays) {
      rolePerms.forEach(collect);
    }

    return result;
  }

  /**
   * Get only the permissions granted directly to a user — not via roles.
   */
  async getDirectPermissions(userId: string): Promise<Permission[]> {
    return this.adapter.getDirectPermissionsForUser(userId);
  }

  /**
   * Grant a permission directly to a user (not via a role).
   * @throws {PermissionNotFoundError} if the permission does not exist.
   */
  async assignPermission(userId: string, permissionName: string): Promise<void> {
    const permission = await this.adapter.findPermission(permissionName);
    if (!permission) throw new PermissionNotFoundError(permissionName);
    await this.adapter.grantPermissionToUser(userId, permissionName);
  }

  /**
   * Revoke a directly-granted permission from a user.
   * Idempotent — no-op if the user does not hold the permission directly.
   * Does not affect permissions inherited via roles.
   */
  async revokePermission(userId: string, permissionName: string): Promise<void> {
    await this.adapter.revokePermissionFromUser(userId, permissionName);
  }

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  /**
   * Grant a permission to a role.
   * @throws {RoleNotFoundError} if the role does not exist.
   * @throws {PermissionNotFoundError} if the permission does not exist.
   */
  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    await this.adapter.grantPermissionToRole(roleName, permissionName);
  }

  /**
   * Revoke a permission from a role.
   * Idempotent — no-op if the role does not hold the permission.
   */
  async revokePermissionFromRole(roleName: string, permissionName: string): Promise<void> {
    await this.adapter.revokePermissionFromRole(roleName, permissionName);
  }

  /**
   * Get all permissions currently granted to a role.
   */
  async getRolePermissions(roleName: string): Promise<Permission[]> {
    return this.adapter.getPermissionsForRole(roleName);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Resolve the full set of effective permission names for a user.
   * Used internally by canAll / canAny to avoid loading full Permission objects
   * when we only need to check membership.
   */
  private async resolveEffectivePermissionNames(userId: string): Promise<Set<string>> {
    if (this.adapter.getEffectivePermissions) {
      const perms = await this.adapter.getEffectivePermissions(userId);
      return new Set(perms.map((p) => p.name));
    }

    const [roles, directPerms] = await Promise.all([
      this.adapter.getRolesForUser(userId),
      this.adapter.getDirectPermissionsForUser(userId),
    ]);

    const names = new Set<string>(directPerms.map((p) => p.name));

    const rolePermsArrays = await Promise.all(
      roles.map((role) => this.adapter.getPermissionsForRole(role.name)),
    );
    for (const rolePerms of rolePermsArrays) {
      for (const perm of rolePerms) {
        names.add(perm.name);
      }
    }

    return names;
  }
}
