import { Inject } from '@nestjs/common';
import {
  createAuthorization,
  type Authorization,
  type CreatePermissionOptions,
  type CreateRoleOptions,
  type Permission,
  type Role,
} from '@arx/core';
import type { ArxModuleOptions } from './interfaces';
import { ARX_MODULE_OPTIONS } from './tokens';

/**
 * Injectable wrapper around the @arx/core Authorization instance.
 *
 * Import ArxModule in your feature module (or rely on the global registration)
 * and inject ArxService wherever you need programmatic access control checks.
 *
 * @example
 * \@Injectable()
 * export class PostsService {
 *   constructor(private readonly arx: ArxService) {}
 *
 *   async publish(userId: string, postId: string) {
 *     if (!await this.arx.can(userId, 'post:publish')) {
 *       throw new ForbiddenException()
 *     }
 *     // ...
 *   }
 * }
 */
export class ArxService {
  private readonly arx: Authorization;

  constructor(@Inject(ARX_MODULE_OPTIONS) options: ArxModuleOptions) {
    this.arx = createAuthorization({ adapter: options.adapter });
  }

  // ─── Checking access ───────────────────────────────────────────────────────

  can(userId: string, permission: string): Promise<boolean> {
    return this.arx.can(userId, permission);
  }

  canAll(userId: string, permissions: string[]): Promise<boolean> {
    return this.arx.canAll(userId, permissions);
  }

  canAny(userId: string, permissions: string[]): Promise<boolean> {
    return this.arx.canAny(userId, permissions);
  }

  hasRole(userId: string, role: string): Promise<boolean> {
    return this.arx.hasRole(userId, role);
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  createRole(name: string, options?: CreateRoleOptions): Promise<Role> {
    return this.arx.createRole(name, options);
  }

  deleteRole(name: string): Promise<void> {
    return this.arx.deleteRole(name);
  }

  assignRole(userId: string, roleName: string): Promise<void> {
    return this.arx.assignRole(userId, roleName);
  }

  revokeRole(userId: string, roleName: string): Promise<void> {
    return this.arx.revokeRole(userId, roleName);
  }

  getRoles(userId: string): Promise<Role[]> {
    return this.arx.getRoles(userId);
  }

  getRolePermissions(roleName: string): Promise<Permission[]> {
    return this.arx.getRolePermissions(roleName);
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  createPermission(
    name: string,
    options?: CreatePermissionOptions,
  ): Promise<Permission> {
    return this.arx.createPermission(name, options);
  }

  deletePermission(name: string): Promise<void> {
    return this.arx.deletePermission(name);
  }

  assignPermission(userId: string, permissionName: string): Promise<void> {
    return this.arx.assignPermission(userId, permissionName);
  }

  revokePermission(userId: string, permissionName: string): Promise<void> {
    return this.arx.revokePermission(userId, permissionName);
  }

  grantPermissionToRole(
    roleName: string,
    permissionName: string,
  ): Promise<void> {
    return this.arx.grantPermissionToRole(roleName, permissionName);
  }

  revokePermissionFromRole(
    roleName: string,
    permissionName: string,
  ): Promise<void> {
    return this.arx.revokePermissionFromRole(roleName, permissionName);
  }

  getPermissions(userId: string): Promise<Permission[]> {
    return this.arx.getPermissions(userId);
  }

  getDirectPermissions(userId: string): Promise<Permission[]> {
    return this.arx.getDirectPermissions(userId);
  }
}
