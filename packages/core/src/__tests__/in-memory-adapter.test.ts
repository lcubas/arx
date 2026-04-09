import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAdapter } from '../in-memory-adapter.js';
import { testStorageAdapterContract } from './contract/storage-adapter.contract.js';

// ─── Contract compliance ──────────────────────────────────────────────────────

describe('InMemoryAdapter — StorageAdapter contract', () => {
  testStorageAdapterContract({
    create: () => new InMemoryAdapter(),
  });
});

// ─── InMemoryAdapter-specific behaviour ──────────────────────────────────────

describe('InMemoryAdapter — specific behaviour', () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  describe('reset()', () => {
    it('clears all roles, permissions and assignments', async () => {
      await adapter.createRole('admin');
      await adapter.createPermission('delete:all');
      await adapter.grantPermissionToRole('admin', 'delete:all');
      await adapter.assignRoleToUser('user-1', 'admin');
      await adapter.grantPermissionToUser('user-1', 'delete:all');

      adapter.reset();

      expect(await adapter.findRole('admin')).toBeNull();
      expect(await adapter.findPermission('delete:all')).toBeNull();
      expect(await adapter.getRolesForUser('user-1')).toEqual([]);
      expect(await adapter.getDirectPermissionsForUser('user-1')).toEqual([]);
    });

    it('allows recreating the same role name after reset', async () => {
      await adapter.createRole('admin');
      adapter.reset();
      const role = await adapter.createRole('admin');
      expect(role.name).toBe('admin');
    });
  });

  describe('getEffectivePermissions()', () => {
    it('unions direct and role-inherited permissions without duplicates', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.createPermission('view:post');
      await adapter.createPermission('delete:post');

      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'view:post');
      await adapter.assignRoleToUser('user-1', 'editor');
      // edit:post granted via role AND directly — must appear only once
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      await adapter.grantPermissionToUser('user-1', 'delete:post');

      const perms = await adapter.getEffectivePermissions?.('user-1');
      const names = perms.map((p) => p.name).sort();
      expect(names).toEqual(['delete:post', 'edit:post', 'view:post']);
    });

    it('returns empty array for a user with no assignments', async () => {
      const perms = await adapter.getEffectivePermissions?.('user-1');
      expect(perms).toEqual([]);
    });
  });

  describe('user isolation', () => {
    it('user-1 and user-2 have independent permission sets', async () => {
      await adapter.createPermission('admin:write');
      await adapter.grantPermissionToUser('user-1', 'admin:write');
      expect(await adapter.getDirectPermissionsForUser('user-2')).toEqual([]);
    });
  });
});
