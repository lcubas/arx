import type { StorageAdapter } from './adapter';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors';
import type { Permission, Role } from './types';

/**
 * In-memory implementation of StorageAdapter.
 *
 * Intended for **testing only** — data does not persist between process
 * restarts and is not safe for concurrent use across multiple instances.
 *
 * @example
 * import { InMemoryAdapter, createAuthorization } from '@arx/core'
 *
 * const adapter = new InMemoryAdapter()
 * const { can, assignRole } = createAuthorization({ adapter })
 *
 * // Reset state between tests
 * afterEach(() => adapter.reset())
 */
export class InMemoryAdapter implements StorageAdapter {
  private readonly roles = new Map<string, Role>();
  private readonly permissions = new Map<string, Permission>();
  // roleName → Set<permissionName>
  private readonly rolePermissions = new Map<string, Set<string>>();
  // userId → Set<roleName>
  private readonly userRoles = new Map<string, Set<string>>();
  // userId → Set<permissionName>
  private readonly userPermissions = new Map<string, Set<string>>();

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async createRole(name: string): Promise<Role> {
    if (this.roles.has(name)) {
      throw new RoleAlreadyExistsError(name);
    }
    const role: Role = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    this.roles.set(name, role);
    this.rolePermissions.set(name, new Set());
    return role;
  }

  async findRole(name: string): Promise<Role | null> {
    return this.roles.get(name) ?? null;
  }

  async deleteRole(name: string): Promise<void> {
    this.roles.delete(name);
    this.rolePermissions.delete(name);
    // Remove this role from every user's assignment set
    for (const roles of this.userRoles.values()) {
      roles.delete(name);
    }
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  async createPermission(name: string): Promise<Permission> {
    if (this.permissions.has(name)) {
      throw new PermissionAlreadyExistsError(name);
    }
    const permission: Permission = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    this.permissions.set(name, permission);
    return permission;
  }

  async findPermission(name: string): Promise<Permission | null> {
    return this.permissions.get(name) ?? null;
  }

  async deletePermission(name: string): Promise<void> {
    this.permissions.delete(name);
    // Remove from every role's permission set
    for (const perms of this.rolePermissions.values()) {
      perms.delete(name);
    }
    // Remove from every user's direct permission set
    for (const perms of this.userPermissions.values()) {
      perms.delete(name);
    }
  }

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    if (!this.roles.has(roleName)) throw new RoleNotFoundError(roleName);
    if (!this.permissions.has(permissionName)) throw new PermissionNotFoundError(permissionName);

    const perms = this.rolePermissions.get(roleName) ?? new Set<string>();
    perms.add(permissionName);
    this.rolePermissions.set(roleName, perms);
  }

  async revokePermissionFromRole(roleName: string, permissionName: string): Promise<void> {
    this.rolePermissions.get(roleName)?.delete(permissionName);
  }

  async getPermissionsForRole(roleName: string): Promise<Permission[]> {
    const names = this.rolePermissions.get(roleName);
    if (!names) return [];
    return [...names]
      .map((n) => this.permissions.get(n))
      .filter((p): p is Permission => p !== undefined);
  }

  // ─── User ↔ Role ───────────────────────────────────────────────────────────

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    if (!this.roles.has(roleName)) throw new RoleNotFoundError(roleName);

    const roles = this.userRoles.get(userId) ?? new Set<string>();
    roles.add(roleName);
    this.userRoles.set(userId, roles);
  }

  async revokeRoleFromUser(userId: string, roleName: string): Promise<void> {
    this.userRoles.get(userId)?.delete(roleName);
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const names = this.userRoles.get(userId);
    if (!names) return [];
    return [...names].map((n) => this.roles.get(n)).filter((r): r is Role => r !== undefined);
  }

  // ─── User ↔ Permission (direct) ────────────────────────────────────────────

  async grantPermissionToUser(userId: string, permissionName: string): Promise<void> {
    if (!this.permissions.has(permissionName)) throw new PermissionNotFoundError(permissionName);

    const perms = this.userPermissions.get(userId) ?? new Set<string>();
    perms.add(permissionName);
    this.userPermissions.set(userId, perms);
  }

  async revokePermissionFromUser(userId: string, permissionName: string): Promise<void> {
    this.userPermissions.get(userId)?.delete(permissionName);
  }

  async getDirectPermissionsForUser(userId: string): Promise<Permission[]> {
    const names = this.userPermissions.get(userId);
    if (!names) return [];
    return [...names]
      .map((n) => this.permissions.get(n))
      .filter((p): p is Permission => p !== undefined);
  }

  // ─── Optional optimization ─────────────────────────────────────────────────

  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const roleNames = this.userRoles.get(userId) ?? new Set<string>();
    const directPermNames = this.userPermissions.get(userId) ?? new Set<string>();

    // Union of direct permissions + role-inherited permissions
    const effectiveNames = new Set<string>(directPermNames);
    for (const roleName of roleNames) {
      const rolePerms = this.rolePermissions.get(roleName) ?? new Set<string>();
      for (const permName of rolePerms) {
        effectiveNames.add(permName);
      }
    }

    return [...effectiveNames]
      .map((n) => this.permissions.get(n))
      .filter((p): p is Permission => p !== undefined);
  }

  // ─── Test utilities ────────────────────────────────────────────────────────

  /**
   * Reset all stored data.
   * Call this in `afterEach` to ensure test isolation.
   */
  reset(): void {
    this.roles.clear();
    this.permissions.clear();
    this.rolePermissions.clear();
    this.userRoles.clear();
    this.userPermissions.clear();
  }
}
