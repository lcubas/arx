/**
 * @arxjs/core/testing
 *
 * Test utilities for verifying that a custom `StorageAdapter` implementation
 * satisfies the full behavioral contract expected by `@arxjs/core`.
 *
 * Kept out of the main entry point so it (and its `vitest` peer dependency)
 * never end up in a production bundle.
 *
 * @example
 * ```ts
 * // packages/prisma/src/tests/contract.test.ts
 * import { testStorageAdapterContract } from '@arxjs/core/testing'
 * import { PrismaAdapter } from '../adapter'
 *
 * testStorageAdapterContract({
 *   create: () => new PrismaAdapter(prisma),
 *   reset: async () => { await truncateAll(prisma) },
 * })
 * ```
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { StorageAdapter } from './adapter';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors';

export interface StorageAdapterContractOptions {
  /** Factory called before each test — must return a fresh, empty adapter. */
  create: () => StorageAdapter;
  /**
   * Optional async cleanup, run before `create()` on every test (not just
   * once at the start) — e.g. truncating tables on a persistent test
   * database that outlives a single test file. Not needed for adapters
   * backed by a fresh in-memory database per test.
   */
  reset?: () => Promise<void>;
}

/**
 * Registers a `describe` block that exercises the full `StorageAdapter`
 * contract documented in `@arxjs/core`'s `adapter.ts` — CRUD, idempotency of
 * grant/revoke/assign/unassign, the typed-error contract, and (unlike the
 * per-adapter CRUD tests each adapter package already has) concurrent calls
 * to the same grant/assign, which is where a check-then-insert implementation
 * can silently violate the documented idempotency guarantee.
 *
 * Call this once inside your adapter's own test file, alongside whatever
 * adapter-specific tests you already have — it's additive, not a replacement.
 */
export function testStorageAdapterContract(opts: StorageAdapterContractOptions): void {
  let adapter: StorageAdapter;

  beforeEach(async () => {
    if (opts.reset) await opts.reset();
    adapter = opts.create();
  });

  describe('createRole()', () => {
    it('returns a role with id, name and createdAt', async () => {
      const role = await adapter.createRole('editor');
      expect(role.name).toBe('editor');
      expect(typeof role.id).toBe('string');
      expect(role.id.length).toBeGreaterThan(0);
      expect(role.createdAt).toBeInstanceOf(Date);
    });

    it('throws RoleAlreadyExistsError on duplicate name', async () => {
      await adapter.createRole('editor');
      await expect(adapter.createRole('editor')).rejects.toThrow(RoleAlreadyExistsError);
    });

    it('allows creating roles with different names', async () => {
      const r1 = await adapter.createRole('editor');
      const r2 = await adapter.createRole('moderator');
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('findRole()', () => {
    it('returns the role when it exists', async () => {
      await adapter.createRole('editor');
      const role = await adapter.findRole('editor');
      expect(role?.name).toBe('editor');
    });

    it('returns null when the role does not exist', async () => {
      expect(await adapter.findRole('ghost')).toBeNull();
    });
  });

  describe('deleteRole()', () => {
    it('removes the role so findRole returns null', async () => {
      await adapter.createRole('editor');
      await adapter.deleteRole('editor');
      expect(await adapter.findRole('editor')).toBeNull();
    });

    it('is idempotent — does not throw for a non-existent role', async () => {
      await expect(adapter.deleteRole('ghost')).resolves.toBeUndefined();
    });
  });

  describe('createPermission()', () => {
    it('returns a permission with id, name and createdAt', async () => {
      const perm = await adapter.createPermission('edit:post');
      expect(perm.name).toBe('edit:post');
      expect(typeof perm.id).toBe('string');
      expect(perm.createdAt).toBeInstanceOf(Date);
    });

    it('throws PermissionAlreadyExistsError on duplicate name', async () => {
      await adapter.createPermission('edit:post');
      await expect(adapter.createPermission('edit:post')).rejects.toThrow(
        PermissionAlreadyExistsError,
      );
    });
  });

  describe('findPermission()', () => {
    it('returns the permission when it exists', async () => {
      await adapter.createPermission('edit:post');
      expect((await adapter.findPermission('edit:post'))?.name).toBe('edit:post');
    });

    it('returns null when the permission does not exist', async () => {
      expect(await adapter.findPermission('ghost')).toBeNull();
    });
  });

  describe('deletePermission()', () => {
    it('removes the permission', async () => {
      await adapter.createPermission('edit:post');
      await adapter.deletePermission('edit:post');
      expect(await adapter.findPermission('edit:post')).toBeNull();
    });

    it('is idempotent — does not throw for a non-existent permission', async () => {
      await expect(adapter.deletePermission('ghost')).resolves.toBeUndefined();
    });
  });

  describe('grantPermissionToRole()', () => {
    it('makes getPermissionsForRole return the permission', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      const perms = await adapter.getPermissionsForRole('editor');
      expect(perms.map((p) => p.name)).toContain('edit:post');
    });

    it('throws RoleNotFoundError for a non-existent role', async () => {
      await adapter.createPermission('edit:post');
      await expect(adapter.grantPermissionToRole('ghost', 'edit:post')).rejects.toThrow(
        RoleNotFoundError,
      );
    });

    it('throws PermissionNotFoundError for a non-existent permission', async () => {
      await adapter.createRole('editor');
      await expect(adapter.grantPermissionToRole('editor', 'ghost')).rejects.toThrow(
        PermissionNotFoundError,
      );
    });

    it('is idempotent — granting twice does not duplicate', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      const perms = await adapter.getPermissionsForRole('editor');
      expect(perms.filter((p) => p.name === 'edit:post')).toHaveLength(1);
    });
  });

  describe('revokePermissionFromRole()', () => {
    it('removes the permission from the role', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.revokePermissionFromRole('editor', 'edit:post');
      const perms = await adapter.getPermissionsForRole('editor');
      expect(perms.map((p) => p.name)).not.toContain('edit:post');
    });

    it('is idempotent — does not throw if not granted', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await expect(
        adapter.revokePermissionFromRole('editor', 'edit:post'),
      ).resolves.toBeUndefined();
    });

    it('is idempotent — does not throw for non-existent role or permission', async () => {
      await expect(adapter.revokePermissionFromRole('ghost', 'ghost')).resolves.toBeUndefined();
    });
  });

  describe('assignRoleToUser()', () => {
    it('makes getRolesForUser return the role', async () => {
      await adapter.createRole('editor');
      await adapter.assignRoleToUser('user-1', 'editor');
      const roles = await adapter.getRolesForUser('user-1');
      expect(roles.map((r) => r.name)).toContain('editor');
    });

    it('throws RoleNotFoundError for a non-existent role', async () => {
      await expect(adapter.assignRoleToUser('user-1', 'ghost')).rejects.toThrow(RoleNotFoundError);
    });

    it('is idempotent — assigning twice does not duplicate', async () => {
      await adapter.createRole('editor');
      await adapter.assignRoleToUser('user-1', 'editor');
      await adapter.assignRoleToUser('user-1', 'editor');
      const roles = await adapter.getRolesForUser('user-1');
      expect(roles.filter((r) => r.name === 'editor')).toHaveLength(1);
    });
  });

  describe('revokeRoleFromUser()', () => {
    it('removes the role from the user', async () => {
      await adapter.createRole('editor');
      await adapter.assignRoleToUser('user-1', 'editor');
      await adapter.revokeRoleFromUser('user-1', 'editor');
      const roles = await adapter.getRolesForUser('user-1');
      expect(roles.map((r) => r.name)).not.toContain('editor');
    });

    it('is idempotent — does not throw if role was not assigned', async () => {
      await adapter.createRole('editor');
      await expect(adapter.revokeRoleFromUser('user-1', 'editor')).resolves.toBeUndefined();
    });

    it('is idempotent — does not throw for a non-existent role', async () => {
      await expect(adapter.revokeRoleFromUser('user-1', 'ghost')).resolves.toBeUndefined();
    });
  });

  describe('grantPermissionToUser()', () => {
    it('makes getDirectPermissionsForUser return the permission', async () => {
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      const perms = await adapter.getDirectPermissionsForUser('user-1');
      expect(perms.map((p) => p.name)).toContain('edit:post');
    });

    it('throws PermissionNotFoundError for a non-existent permission', async () => {
      await expect(adapter.grantPermissionToUser('user-1', 'ghost')).rejects.toThrow(
        PermissionNotFoundError,
      );
    });

    it('is idempotent — granting twice does not duplicate', async () => {
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      const perms = await adapter.getDirectPermissionsForUser('user-1');
      expect(perms.filter((p) => p.name === 'edit:post')).toHaveLength(1);
    });
  });

  describe('revokePermissionFromUser()', () => {
    it('removes the direct permission from the user', async () => {
      await adapter.createPermission('edit:post');
      await adapter.grantPermissionToUser('user-1', 'edit:post');
      await adapter.revokePermissionFromUser('user-1', 'edit:post');
      const perms = await adapter.getDirectPermissionsForUser('user-1');
      expect(perms.map((p) => p.name)).not.toContain('edit:post');
    });

    it('is idempotent — does not throw if not assigned', async () => {
      await adapter.createPermission('edit:post');
      await expect(
        adapter.revokePermissionFromUser('user-1', 'edit:post'),
      ).resolves.toBeUndefined();
    });

    it('is idempotent — does not throw for a non-existent permission', async () => {
      await expect(adapter.revokePermissionFromUser('user-1', 'ghost')).resolves.toBeUndefined();
    });
  });

  describe('getEffectivePermissions() [optional]', () => {
    it('returns direct + role-inherited permissions deduplicated (if implemented)', async () => {
      if (!adapter.getEffectivePermissions) return;

      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');
      await adapter.createPermission('view:post');
      await adapter.createPermission('delete:post');

      await adapter.grantPermissionToRole('editor', 'edit:post');
      await adapter.grantPermissionToRole('editor', 'view:post');
      await adapter.assignRoleToUser('user-1', 'editor');
      await adapter.grantPermissionToUser('user-1', 'edit:post'); // duplicate via direct grant
      await adapter.grantPermissionToUser('user-1', 'delete:post');

      const perms = await adapter.getEffectivePermissions('user-1');
      const names = perms.map((p) => p.name).sort();
      expect(names).toEqual(['delete:post', 'edit:post', 'view:post']);
    });
  });

  // Concurrent calls to the same grant/assign must still behave idempotently
  // per the StorageAdapter contract — a naive check-then-insert implementation
  // can pass its own existence check twice and then race on the DB's
  // unique/primary-key constraint, surfacing a raw driver error instead of a
  // silent no-op.
  describe('concurrency', () => {
    it('creating the same role concurrently only ever throws RoleAlreadyExistsError', async () => {
      const results = await Promise.allSettled([
        adapter.createRole('editor'),
        adapter.createRole('editor'),
      ]);

      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toBeInstanceOf(RoleAlreadyExistsError);
      expect(await adapter.findRole('editor')).not.toBeNull();
    });

    it('creating the same permission concurrently only ever throws PermissionAlreadyExistsError', async () => {
      const results = await Promise.allSettled([
        adapter.createPermission('edit:post'),
        adapter.createPermission('edit:post'),
      ]);

      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toBeInstanceOf(PermissionAlreadyExistsError);
      expect(await adapter.findPermission('edit:post')).not.toBeNull();
    });

    it('granting the same role-permission concurrently is idempotent, never throws', async () => {
      await adapter.createRole('editor');
      await adapter.createPermission('edit:post');

      await expect(
        Promise.all([
          adapter.grantPermissionToRole('editor', 'edit:post'),
          adapter.grantPermissionToRole('editor', 'edit:post'),
        ]),
      ).resolves.toBeDefined();

      expect(await adapter.getPermissionsForRole('editor')).toHaveLength(1);
    });

    it('assigning the same role to a user concurrently is idempotent, never throws', async () => {
      await adapter.createRole('editor');

      await expect(
        Promise.all([
          adapter.assignRoleToUser('user-1', 'editor'),
          adapter.assignRoleToUser('user-1', 'editor'),
        ]),
      ).resolves.toBeDefined();

      expect(await adapter.getRolesForUser('user-1')).toHaveLength(1);
    });

    it('granting the same direct permission concurrently is idempotent, never throws', async () => {
      await adapter.createPermission('edit:post');

      await expect(
        Promise.all([
          adapter.grantPermissionToUser('user-1', 'edit:post'),
          adapter.grantPermissionToUser('user-1', 'edit:post'),
        ]),
      ).resolves.toBeDefined();

      expect(await adapter.getDirectPermissionsForUser('user-1')).toHaveLength(1);
    });
  });
}
