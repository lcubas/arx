import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '@arxjs/core';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TypeOrmAdapter } from '../adapter';
import { createTestDataSource } from './setup';

describe('TypeOrmAdapter', () => {
  let dataSource: DataSource;
  let adapter: TypeOrmAdapter;

  beforeEach(async () => {
    dataSource = createTestDataSource();
    await dataSource.initialize();
    adapter = new TypeOrmAdapter(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('roles', () => {
    it('creates and finds a role', async () => {
      const role = await adapter.createRole('editor');
      expect(role.name).toBe('editor');
      expect(await adapter.findRole('editor')).toEqual(role);
    });

    it('returns null for a role that does not exist', async () => {
      expect(await adapter.findRole('ghost')).toBeNull();
    });

    it('throws RoleAlreadyExistsError on duplicate name', async () => {
      await adapter.createRole('editor');
      await expect(adapter.createRole('editor')).rejects.toBeInstanceOf(RoleAlreadyExistsError);
    });

    it('deletes a role and cascades its assignments', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.assignRoleToUser('user-1', 'editor');

      await adapter.deleteRole('editor');

      expect(await adapter.findRole('editor')).toBeNull();
      expect(await adapter.getRolesForUser('user-1')).toEqual([]);
    });

    it('is a no-op deleting a role that does not exist', async () => {
      await expect(adapter.deleteRole('ghost')).resolves.toBeUndefined();
    });
  });

  describe('permissions', () => {
    it('creates and finds a permission', async () => {
      const permission = await adapter.createPermission('edit:post');
      expect(permission.name).toBe('edit:post');
      expect(await adapter.findPermission('edit:post')).toEqual(permission);
    });

    it('throws PermissionAlreadyExistsError on duplicate name', async () => {
      await adapter.createPermission('edit:post');
      await expect(adapter.createPermission('edit:post')).rejects.toBeInstanceOf(
        PermissionAlreadyExistsError,
      );
    });

    it('deletes a permission and cascades its assignments', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.deletePermission('edit:post');

      expect(await adapter.getPermissionsForRole('editor')).toEqual([]);
    });
  });

  describe('role <-> permission', () => {
    it('grants and lists permissions for a role', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.createPermission('view:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'view:post');

      const perms = await adapter.getPermissionsForRole('editor');
      expect(perms.map((p) => p.name).sort()).toEqual(['edit:post', 'view:post']);
    });

    it('is idempotent when granting the same permission twice', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');

      expect(await adapter.getPermissionsForRole('editor')).toHaveLength(1);
    });

    it('throws RoleNotFoundError when the role does not exist', async () => {
      await adapter.createPermission('edit:post');
      await expect(adapter.grantPermissionToRole('ghost', 'edit:post')).rejects.toBeInstanceOf(
        RoleNotFoundError,
      );
    });

    it('throws PermissionNotFoundError when the permission does not exist', async () => {
      await adapter.createRole('editor');
      await expect(adapter.grantPermissionToRole('editor', 'ghost')).rejects.toBeInstanceOf(
        PermissionNotFoundError,
      );
    });

    it('revokes a permission from a role, idempotently', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');

      await adapter.revokePermissionFromRole('editor', 'edit:post');
      await adapter.revokePermissionFromRole('editor', 'edit:post');

      expect(await adapter.getPermissionsForRole('editor')).toEqual([]);
    });
  });

  describe('user <-> role', () => {
    it('assigns and lists roles for a user', async () => {
      await adapter.createRole('editor');
      await adapter.assignRoleToUser('user-1', 'editor');

      const roles = await adapter.getRolesForUser('user-1');
      expect(roles.map((r) => r.name)).toEqual(['editor']);
    });

    it('throws RoleNotFoundError assigning a missing role', async () => {
      await expect(adapter.assignRoleToUser('user-1', 'ghost')).rejects.toBeInstanceOf(
        RoleNotFoundError,
      );
    });

    it('revokes a role from a user, idempotently', async () => {
      await adapter.createRole('editor');
      await adapter.assignRoleToUser('user-1', 'editor');

      await adapter.revokeRoleFromUser('user-1', 'editor');
      await adapter.revokeRoleFromUser('user-1', 'editor');

      expect(await adapter.getRolesForUser('user-1')).toEqual([]);
    });
  });

  describe('user <-> permission (direct)', () => {
    it('grants and lists direct permissions for a user', async () => {
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');

      const perms = await adapter.getDirectPermissionsForUser('user-1');
      expect(perms.map((p) => p.name)).toEqual(['edit:post']);
    });

    it('throws PermissionNotFoundError granting a missing permission', async () => {
      await expect(adapter.grantPermissionToUser('user-1', 'ghost')).rejects.toBeInstanceOf(
        PermissionNotFoundError,
      );
    });

    it('revokes a direct permission from a user, idempotently', async () => {
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');

      await adapter.revokePermissionFromUser('user-1', 'edit:post');
      await adapter.revokePermissionFromUser('user-1', 'edit:post');

      expect(await adapter.getDirectPermissionsForUser('user-1')).toEqual([]);
    });
  });

  describe('getEffectivePermissions', () => {
    it('merges direct and role-inherited permissions, deduplicated', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.createPermission('view:post');
      await adapter.createPermission('publish:post');

      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'view:post');
      await adapter.assignRoleToUser('user-1', 'editor');
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      await adapter.grantPermissionToUser('user-1', 'publish:post');

      const perms = await adapter.getEffectivePermissions('user-1');
      expect(perms.map((p) => p.name).sort()).toEqual(['edit:post', 'publish:post', 'view:post']);
    });

    it('returns an empty array for a user with no roles or permissions', async () => {
      expect(await adapter.getEffectivePermissions('user-1')).toEqual([]);
    });
  });
});
