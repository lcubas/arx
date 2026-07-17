import { describe, expect, it } from 'vitest';
import { DrizzleMysqlAdapter } from '../adapters/mysql';
import { DrizzlePgAdapter } from '../adapters/pg';

// DrizzlePgAdapter and DrizzleMysqlAdapter are thin constructors that bind
// their dialect's schema to the shared DrizzleAdapter — all query logic is
// exercised in adapter.test.ts via DrizzleSqliteAdapter. These just confirm
// the subclasses instantiate and expose the StorageAdapter contract.
describe('dialect adapters', () => {
  it('DrizzlePgAdapter instantiates and implements StorageAdapter', () => {
    const adapter = new DrizzlePgAdapter({});
    expect(typeof adapter.createRole).toBe('function');
    expect(typeof adapter.getEffectivePermissions).toBe('function');
  });

  it('DrizzleMysqlAdapter instantiates and implements StorageAdapter', () => {
    const adapter = new DrizzleMysqlAdapter({});
    expect(typeof adapter.createRole).toBe('function');
    expect(typeof adapter.getEffectivePermissions).toBe('function');
  });
});
