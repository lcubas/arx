import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // All test files share one physical SQLite file (test.db) and reset it
    // between tests — running files in parallel workers races on that
    // shared state (one file's beforeEach can wipe rows mid-test in
    // another). Drizzle/TypeORM don't need this: each test there gets its
    // own fresh in-memory database.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
