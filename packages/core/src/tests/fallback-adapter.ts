import type { StorageAdapter } from '../adapter';
import { InMemoryAdapter } from '../in-memory-adapter';

/**
 * Wraps InMemoryAdapter but deliberately omits the optional
 * `getEffectivePermissions` fast path, forcing AuthorizationEngine's
 * per-role fallback loop in can()/canAll()/canAny(). Every shipped adapter
 * (and every existing test) implements the fast path, so without this the
 * fallback branch in engine.ts has no coverage at all.
 */
export class FallbackOnlyAdapter implements StorageAdapter {
  private readonly inner = new InMemoryAdapter();

  createRole = this.inner.createRole.bind(this.inner);
  findRole = this.inner.findRole.bind(this.inner);
  deleteRole = this.inner.deleteRole.bind(this.inner);
  createPermission = this.inner.createPermission.bind(this.inner);
  findPermission = this.inner.findPermission.bind(this.inner);
  deletePermission = this.inner.deletePermission.bind(this.inner);
  grantPermissionToRole = this.inner.grantPermissionToRole.bind(this.inner);
  revokePermissionFromRole = this.inner.revokePermissionFromRole.bind(this.inner);
  getPermissionsForRole = this.inner.getPermissionsForRole.bind(this.inner);
  assignRoleToUser = this.inner.assignRoleToUser.bind(this.inner);
  revokeRoleFromUser = this.inner.revokeRoleFromUser.bind(this.inner);
  getRolesForUser = this.inner.getRolesForUser.bind(this.inner);
  grantPermissionToUser = this.inner.grantPermissionToUser.bind(this.inner);
  revokePermissionFromUser = this.inner.revokePermissionFromUser.bind(this.inner);
  getDirectPermissionsForUser = this.inner.getDirectPermissionsForUser.bind(this.inner);

  // Deliberately no getEffectivePermissions.
}
