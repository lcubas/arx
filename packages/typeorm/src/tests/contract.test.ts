import { testStorageAdapterContract } from '@arxjs/core/testing';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach } from 'vitest';
import { TypeOrmAdapter } from '../adapter';
import { createTestDataSource } from './setup';

// Shared StorageAdapter conformance suite from @arxjs/core. Additive to
// adapter.test.ts, not a replacement — this is what catches contract
// violations (e.g. idempotency under concurrency) that dialect-specific
// tests may not think to check for.
let dataSource: DataSource;

beforeEach(async () => {
  dataSource = createTestDataSource();
  await dataSource.initialize();
});

afterEach(async () => {
  await dataSource.destroy();
});

testStorageAdapterContract({
  create: () => new TypeOrmAdapter(dataSource),
});
