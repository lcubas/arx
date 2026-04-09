/**
 * @arx/core/testing
 *
 * Test utilities for verifying that a custom `StorageAdapter` implementation
 * satisfies the full behavioural contract expected by `@arx/core`.
 *
 * Import this in your adapter's test suite — it is intentionally kept out of
 * the main `@arx/core` entry point so it never ends up in production bundles.
 *
 * @example
 * ```ts
 * // packages/prisma/src/tests/prisma-adapter.test.ts
 * import { testStorageAdapterContract } from '@arx/core/testing'
 * import { PrismaAdapter } from '../adapter.js'
 *
 * testStorageAdapterContract({
 *   create: () => new PrismaAdapter(prisma),
 *   reset:  async () => { await truncateAll(prisma) },
 * })
 * ```
 *
 * @packageDocumentation
 */

export {
  testStorageAdapterContract,
  type StorageAdapterContractOptions,
} from './tests/contract/storage-adapter.contract';
