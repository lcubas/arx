import { describe, expect, it } from 'vitest';
import { createAuthorization } from '../authorization.js';
import {
  ArxError,
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '../errors.js';
import { InMemoryAdapter } from '../in-memory-adapter.js';

function setup() {
  const adapter = new InMemoryAdapter();
  const arx = createAuthorization({ adapter });
  return { adapter, arx };
}

// ─── can ──────────────────────────────────────────────────────────────────────

describe('can()', () => {
  it('returns false for a user with no roles or permissions', async () => {
    const { arx } = setup();
    expect(await arx.can('user-1', 'edit:post')).toBe(false);
  });

  it('returns false for a non-existent permission (never throws)', async () => {
    const { arx } = setup();
    await arx.createRole('admin');
    await arx.assignRole('user-1', 'admin');
    expect(await arx.can('user-1', 'ghost:permission')).toBe(false);
  });

  it('returns true when the user has the permission directly', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.assignPermission('user-1', 'edit:post');
    expect(await arx.can('user-1', 'edit:post')).toBe(true);
  });

  it('returns true when the user has a role that holds the permission', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.assignRole('user-1', 'editor');
    expect(await arx.can('user-1', 'edit:post')).toBe(true);
  });

  it('returns false when the role exists but does not hold the permission', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.createPermission('delete:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.assignRole('user-1', 'editor');
    expect(await arx.can('user-1', 'delete:post')).toBe(false);
  });

  it('returns true for direct permission even after role is revoked', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.assignRole('user-1', 'editor');
    await arx.assignPermission('user-1', 'edit:post');
    await arx.revokeRole('user-1', 'editor');
    expect(await arx.can('user-1', 'edit:post')).toBe(true);
  });
});

// ─── canAll / canAny ──────────────────────────────────────────────────────────

describe('canAll()', () => {
  it('returns true when the user holds all permissions', async () => {
    const { arx } = setup();
    await arx.createPermission('read');
    await arx.createPermission('write');
    await arx.assignPermission('user-1', 'read');
    await arx.assignPermission('user-1', 'write');
    expect(await arx.canAll('user-1', ['read', 'write'])).toBe(true);
  });

  it('returns false when the user is missing at least one permission', async () => {
    const { arx } = setup();
    await arx.createPermission('read');
    await arx.assignPermission('user-1', 'read');
    expect(await arx.canAll('user-1', ['read', 'write'])).toBe(false);
  });

  it('returns true for an empty permissions array', async () => {
    const { arx } = setup();
    expect(await arx.canAll('user-1', [])).toBe(true);
  });
});

describe('canAny()', () => {
  it('returns true when the user holds at least one permission', async () => {
    const { arx } = setup();
    await arx.createPermission('read');
    await arx.assignPermission('user-1', 'read');
    expect(await arx.canAny('user-1', ['read', 'write'])).toBe(true);
  });

  it('returns false when the user holds none of the permissions', async () => {
    const { arx } = setup();
    await arx.createPermission('read');
    expect(await arx.canAny('user-1', ['read', 'write'])).toBe(false);
  });

  it('returns false for an empty permissions array', async () => {
    const { arx } = setup();
    expect(await arx.canAny('user-1', [])).toBe(false);
  });
});

// ─── hasRole ──────────────────────────────────────────────────────────────────

describe('hasRole()', () => {
  it('returns true when the user has the role', async () => {
    const { arx } = setup();
    await arx.createRole('admin');
    await arx.assignRole('user-1', 'admin');
    expect(await arx.hasRole('user-1', 'admin')).toBe(true);
  });

  it('returns false when the user does not have the role', async () => {
    const { arx } = setup();
    await arx.createRole('admin');
    expect(await arx.hasRole('user-1', 'admin')).toBe(false);
  });

  it('returns false after revoking the role', async () => {
    const { arx } = setup();
    await arx.createRole('admin');
    await arx.assignRole('user-1', 'admin');
    await arx.revokeRole('user-1', 'admin');
    expect(await arx.hasRole('user-1', 'admin')).toBe(false);
  });
});

// ─── createRole ───────────────────────────────────────────────────────────────

describe('createRole()', () => {
  it('creates a role and returns it with id and createdAt', async () => {
    const { arx } = setup();
    const role = await arx.createRole('editor');
    expect(role.name).toBe('editor');
    expect(typeof role.id).toBe('string');
    expect(role.createdAt).toBeInstanceOf(Date);
  });

  it('throws RoleAlreadyExistsError on duplicate name', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await expect(arx.createRole('editor')).rejects.toThrow(RoleAlreadyExistsError);
  });

  it('ifExists:"ignore" returns the existing role without throwing', async () => {
    const { arx } = setup();
    const first = await arx.createRole('editor');
    const second = await arx.createRole('editor', { ifExists: 'ignore' });
    expect(second.id).toBe(first.id);
  });

  it('creates a role and grants permissions in one call', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.createPermission('view:post');
    await arx.createRole('editor', { permissions: ['edit:post', 'view:post'] });
    await arx.assignRole('user-1', 'editor');
    expect(await arx.can('user-1', 'edit:post')).toBe(true);
    expect(await arx.can('user-1', 'view:post')).toBe(true);
  });

  it('createRole with permissions throws PermissionNotFoundError for unknown permission', async () => {
    const { arx } = setup();
    await expect(arx.createRole('editor', { permissions: ['ghost'] })).rejects.toThrow(
      PermissionNotFoundError,
    );
  });
});

// ─── deleteRole ───────────────────────────────────────────────────────────────

describe('deleteRole()', () => {
  it('deletes an existing role', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.deleteRole('editor');
    await arx.createRole('editor'); // can create again — no error expected
  });

  it('is idempotent — does not throw for a non-existent role', async () => {
    const { arx } = setup();
    await expect(arx.deleteRole('ghost')).resolves.toBeUndefined();
  });
});

// ─── assignRole / revokeRole ──────────────────────────────────────────────────

describe('assignRole()', () => {
  it('assigns a role to a user', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.assignRole('user-1', 'editor');
    expect(await arx.hasRole('user-1', 'editor')).toBe(true);
  });

  it('throws RoleNotFoundError for a non-existent role', async () => {
    const { arx } = setup();
    await expect(arx.assignRole('user-1', 'ghost')).rejects.toThrow(RoleNotFoundError);
  });

  it('is idempotent — assigning twice does not throw or duplicate', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.assignRole('user-1', 'editor');
    await arx.assignRole('user-1', 'editor');
    const roles = await arx.getRoles('user-1');
    expect(roles.filter((r) => r.name === 'editor')).toHaveLength(1);
  });
});

describe('revokeRole()', () => {
  it('removes an assigned role from a user', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.assignRole('user-1', 'editor');
    await arx.revokeRole('user-1', 'editor');
    expect(await arx.hasRole('user-1', 'editor')).toBe(false);
  });

  it('is idempotent — does not throw if role was not assigned', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await expect(arx.revokeRole('user-1', 'editor')).resolves.toBeUndefined();
  });

  it('is idempotent — does not throw if role does not exist', async () => {
    const { arx } = setup();
    await expect(arx.revokeRole('user-1', 'ghost')).resolves.toBeUndefined();
  });
});

// ─── createPermission ─────────────────────────────────────────────────────────

describe('createPermission()', () => {
  it('creates a permission and returns it', async () => {
    const { arx } = setup();
    const perm = await arx.createPermission('edit:post');
    expect(perm.name).toBe('edit:post');
    expect(typeof perm.id).toBe('string');
    expect(perm.createdAt).toBeInstanceOf(Date);
  });

  it('throws PermissionAlreadyExistsError on duplicate name', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await expect(arx.createPermission('edit:post')).rejects.toThrow(PermissionAlreadyExistsError);
  });

  it('ifExists:"ignore" returns the existing permission without throwing', async () => {
    const { arx } = setup();
    const first = await arx.createPermission('edit:post');
    const second = await arx.createPermission('edit:post', { ifExists: 'ignore' });
    expect(second.id).toBe(first.id);
  });
});

// ─── deletePermission ─────────────────────────────────────────────────────────

describe('deletePermission()', () => {
  it('deletes an existing permission', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.deletePermission('edit:post');
    await arx.createPermission('edit:post'); // can create again
  });

  it('is idempotent — does not throw for a non-existent permission', async () => {
    const { arx } = setup();
    await expect(arx.deletePermission('ghost')).resolves.toBeUndefined();
  });
});

// ─── assignPermission / revokePermission ──────────────────────────────────────

describe('assignPermission()', () => {
  it('grants a direct permission to a user', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.assignPermission('user-1', 'edit:post');
    expect(await arx.can('user-1', 'edit:post')).toBe(true);
  });

  it('throws PermissionNotFoundError for a non-existent permission', async () => {
    const { arx } = setup();
    await expect(arx.assignPermission('user-1', 'ghost')).rejects.toThrow(PermissionNotFoundError);
  });

  it('is idempotent — assigning twice does not duplicate', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.assignPermission('user-1', 'edit:post');
    await arx.assignPermission('user-1', 'edit:post');
    const perms = await arx.getDirectPermissions('user-1');
    expect(perms.filter((p) => p.name === 'edit:post')).toHaveLength(1);
  });
});

describe('revokePermission()', () => {
  it('removes a direct permission from a user', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await arx.assignPermission('user-1', 'edit:post');
    await arx.revokePermission('user-1', 'edit:post');
    expect(await arx.can('user-1', 'edit:post')).toBe(false);
  });

  it('is idempotent — does not throw if not assigned', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await expect(arx.revokePermission('user-1', 'edit:post')).resolves.toBeUndefined();
  });

  it('is idempotent — does not throw if permission does not exist', async () => {
    const { arx } = setup();
    await expect(arx.revokePermission('user-1', 'ghost')).resolves.toBeUndefined();
  });
});

// ─── grantPermissionToRole / revokePermissionFromRole ─────────────────────────

describe('grantPermissionToRole()', () => {
  it('grants a permission to a role', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    const perms = await arx.getRolePermissions('editor');
    expect(perms.map((p) => p.name)).toContain('edit:post');
  });

  it('throws RoleNotFoundError for a non-existent role', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    await expect(arx.grantPermissionToRole('ghost', 'edit:post')).rejects.toThrow(
      RoleNotFoundError,
    );
  });

  it('throws PermissionNotFoundError for a non-existent permission', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await expect(arx.grantPermissionToRole('editor', 'ghost')).rejects.toThrow(
      PermissionNotFoundError,
    );
  });

  it('is idempotent — granting twice does not duplicate', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    const perms = await arx.getRolePermissions('editor');
    expect(perms.filter((p) => p.name === 'edit:post')).toHaveLength(1);
  });
});

describe('revokePermissionFromRole()', () => {
  it('removes a permission from a role', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.revokePermissionFromRole('editor', 'edit:post');
    const perms = await arx.getRolePermissions('editor');
    expect(perms.map((p) => p.name)).not.toContain('edit:post');
  });

  it('is idempotent — does not throw if not granted', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await expect(arx.revokePermissionFromRole('editor', 'edit:post')).resolves.toBeUndefined();
  });

  it('is idempotent — does not throw for non-existent role or permission', async () => {
    const { arx } = setup();
    await expect(arx.revokePermissionFromRole('ghost', 'ghost')).resolves.toBeUndefined();
  });
});

// ─── getPermissions / getDirectPermissions ────────────────────────────────────

describe('getPermissions()', () => {
  it('returns effective permissions (direct + role-inherited, deduplicated)', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.createPermission('view:post');
    await arx.createPermission('delete:post');

    // edit:post is granted both directly AND via role → must appear once
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.grantPermissionToRole('editor', 'view:post');
    await arx.assignRole('user-1', 'editor');
    await arx.assignPermission('user-1', 'edit:post');
    await arx.assignPermission('user-1', 'delete:post');

    const perms = await arx.getPermissions('user-1');
    const names = perms.map((p) => p.name).sort();
    expect(names).toEqual(['delete:post', 'edit:post', 'view:post']);
  });

  it('returns empty array for a user with no permissions', async () => {
    const { arx } = setup();
    expect(await arx.getPermissions('user-1')).toEqual([]);
  });
});

describe('getDirectPermissions()', () => {
  it('returns only directly assigned permissions, not role-inherited ones', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createPermission('edit:post');
    await arx.createPermission('direct:only');
    await arx.grantPermissionToRole('editor', 'edit:post');
    await arx.assignRole('user-1', 'editor');
    await arx.assignPermission('user-1', 'direct:only');

    const perms = await arx.getDirectPermissions('user-1');
    const names = perms.map((p) => p.name);
    expect(names).toContain('direct:only');
    expect(names).not.toContain('edit:post');
  });
});

// ─── getRoles ─────────────────────────────────────────────────────────────────

describe('getRoles()', () => {
  it('returns all roles assigned to a user', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    await arx.createRole('moderator');
    await arx.assignRole('user-1', 'editor');
    await arx.assignRole('user-1', 'moderator');
    const roles = await arx.getRoles('user-1');
    const names = roles.map((r) => r.name).sort();
    expect(names).toEqual(['editor', 'moderator']);
  });

  it('returns empty array for a user with no roles', async () => {
    const { arx } = setup();
    expect(await arx.getRoles('user-1')).toEqual([]);
  });
});

// ─── Error hierarchy ──────────────────────────────────────────────────────────

describe('error hierarchy', () => {
  it('RoleAlreadyExistsError is instanceof ArxError and Error', async () => {
    const { arx } = setup();
    await arx.createRole('editor');
    const error = await arx.createRole('editor').catch((e) => e);
    expect(error).toBeInstanceOf(RoleAlreadyExistsError);
    expect(error).toBeInstanceOf(ArxError);
    expect(error).toBeInstanceOf(Error);
    expect(error.roleName).toBe('editor');
  });

  it('RoleNotFoundError carries the role name', async () => {
    const { arx } = setup();
    const error = await arx.assignRole('user-1', 'ghost').catch((e) => e);
    expect(error).toBeInstanceOf(RoleNotFoundError);
    expect(error.roleName).toBe('ghost');
  });

  it('PermissionNotFoundError carries the permission name', async () => {
    const { arx } = setup();
    const error = await arx.assignPermission('user-1', 'ghost').catch((e) => e);
    expect(error).toBeInstanceOf(PermissionNotFoundError);
    expect(error.permissionName).toBe('ghost');
  });

  it('PermissionAlreadyExistsError is instanceof ArxError', async () => {
    const { arx } = setup();
    await arx.createPermission('edit:post');
    const error = await arx.createPermission('edit:post').catch((e) => e);
    expect(error).toBeInstanceOf(PermissionAlreadyExistsError);
    expect(error).toBeInstanceOf(ArxError);
  });
});

// ─── Multi-user isolation ─────────────────────────────────────────────────────

describe('multi-user isolation', () => {
  it("user-1's roles and permissions do not affect user-2", async () => {
    const { arx } = setup();
    await arx.createRole('admin');
    await arx.createPermission('delete:all');
    await arx.assignRole('user-1', 'admin');
    await arx.grantPermissionToRole('admin', 'delete:all');
    await arx.assignPermission('user-1', 'delete:all');

    expect(await arx.can('user-2', 'delete:all')).toBe(false);
    expect(await arx.hasRole('user-2', 'admin')).toBe(false);
    expect(await arx.getRoles('user-2')).toEqual([]);
    expect(await arx.getPermissions('user-2')).toEqual([]);
  });
});
