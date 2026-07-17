import { beforeEach, describe, expect, it } from 'vitest';
import type { Authorization } from '../authorization';
import { createAuthorization } from '../authorization';
import { FallbackOnlyAdapter } from './fallback-adapter';

// Every other test in this package runs against InMemoryAdapter, which always
// implements the optional getEffectivePermissions fast path — so the
// "Standard path" branch in engine.ts (can/canAll/canAny composing
// getDirectPermissionsForUser + getRolesForUser + getPermissionsForRole) was
// never actually exercised. These tests use an adapter without that optional
// method to cover it.
describe('AuthorizationEngine — fallback path (no getEffectivePermissions)', () => {
  let auth: Authorization;

  beforeEach(() => {
    auth = createAuthorization({ adapter: new FallbackOnlyAdapter() });
  });

  describe('can', () => {
    it('returns true for a directly-granted permission', async () => {
      await auth.createPermission('edit:post');
      await auth.assignPermission('user-1', 'edit:post');

      expect(await auth.can('user-1', 'edit:post')).toBe(true);
    });

    it('returns true for a permission inherited via a role', async () => {
      await auth.createPermission('edit:post');
      await auth.createRole('editor', { permissions: ['edit:post'] });
      await auth.assignRole('user-1', 'editor');

      expect(await auth.can('user-1', 'edit:post')).toBe(true);
    });

    it('walks past roles that do not have the permission to find one that does', async () => {
      await auth.createPermission('publish:post');
      await auth.createRole('viewer'); // no permissions
      await auth.createRole('editor'); // no permissions
      await auth.createRole('publisher', { permissions: ['publish:post'] });
      await auth.assignRole('user-1', 'viewer');
      await auth.assignRole('user-1', 'editor');
      await auth.assignRole('user-1', 'publisher');

      expect(await auth.can('user-1', 'publish:post')).toBe(true);
    });

    it('returns false when no direct grant or role covers the permission', async () => {
      await auth.createPermission('edit:post');
      await auth.createRole('viewer');
      await auth.assignRole('user-1', 'viewer');

      expect(await auth.can('user-1', 'edit:post')).toBe(false);
    });

    it('returns false for a user with no roles or direct permissions', async () => {
      expect(await auth.can('ghost', 'edit:post')).toBe(false);
    });
  });

  describe('canAll', () => {
    it('is true when every permission is covered by a mix of direct grants and roles', async () => {
      await auth.createPermission('edit:post');
      await auth.createPermission('publish:post');
      await auth.createRole('publisher', { permissions: ['publish:post'] });
      await auth.assignRole('user-1', 'publisher');
      await auth.assignPermission('user-1', 'edit:post');

      expect(await auth.canAll('user-1', ['edit:post', 'publish:post'])).toBe(true);
    });

    it('is false when at least one permission is missing', async () => {
      await auth.createPermission('edit:post');
      await auth.createPermission('publish:post');
      await auth.assignPermission('user-1', 'edit:post');

      expect(await auth.canAll('user-1', ['edit:post', 'publish:post'])).toBe(false);
    });
  });

  describe('canAny', () => {
    it('is true when a permission from a second role matches', async () => {
      await auth.createPermission('publish:post');
      await auth.createRole('viewer');
      await auth.createRole('publisher', { permissions: ['publish:post'] });
      await auth.assignRole('user-1', 'viewer');
      await auth.assignRole('user-1', 'publisher');

      expect(await auth.canAny('user-1', ['edit:post', 'publish:post'])).toBe(true);
    });

    it('is false when none of the permissions are held', async () => {
      await auth.createPermission('edit:post');
      await auth.createPermission('publish:post');

      expect(await auth.canAny('user-1', ['edit:post', 'publish:post'])).toBe(false);
    });
  });
});
