import { describe, expectTypeOf, it } from 'vitest';
import { createAuthorization } from '../authorization';
import { InMemoryAdapter } from '../in-memory-adapter';

// Type-level regression tests for createAuthorization<TPermission, TRole>.
// These have no runtime assertions to fail — what matters is that this file
// still compiles under `tsc --noEmit` (part of `pnpm typecheck`). If a future
// change widens a parameter back to plain `string`, these calls stop
// type-checking.
describe('createAuthorization — type parameters', () => {
  it('narrows permission/role parameters to the given literal unions', () => {
    type Permission = 'edit:post' | 'view:post';
    type Role = 'admin' | 'editor';

    const auth = createAuthorization<Permission, Role>({ adapter: new InMemoryAdapter() });

    expectTypeOf(auth.can).parameter(1).toEqualTypeOf<Permission>();
    expectTypeOf(auth.canAll).parameter(1).toEqualTypeOf<readonly Permission[]>();
    expectTypeOf(auth.hasRole).parameter(1).toEqualTypeOf<Role>();
    expectTypeOf(auth.createRole).parameter(0).toEqualTypeOf<Role>();
    expectTypeOf(auth.grantPermissionToRole).parameter(0).toEqualTypeOf<Role>();
    expectTypeOf(auth.grantPermissionToRole).parameter(1).toEqualTypeOf<Permission>();
  });

  it('defaults to plain string when no type parameters are given', () => {
    const auth = createAuthorization({ adapter: new InMemoryAdapter() });

    expectTypeOf(auth.can).parameter(1).toEqualTypeOf<string>();
    expectTypeOf(auth.hasRole).parameter(1).toEqualTypeOf<string>();
  });
});
