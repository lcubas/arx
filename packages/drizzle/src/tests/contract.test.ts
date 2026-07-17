import { testStorageAdapterContract } from '@arxjs/core/testing';
import { DrizzleSqliteAdapter } from '../adapters/sqlite';
import { createTestDb } from './setup';

// Shared StorageAdapter conformance suite from @arxjs/core, run against the
// SQLite dialect. Additive to adapter.test.ts, not a replacement — this is
// what catches contract violations (e.g. idempotency under concurrency) that
// dialect-specific tests may not think to check for.
testStorageAdapterContract({
  create: () => {
    const { db } = createTestDb();
    return new DrizzleSqliteAdapter(db);
  },
});
