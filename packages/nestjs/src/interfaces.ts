import type { StorageAdapter } from '@arx/core';

/**
 * Options passed to ArxModule.forRoot().
 */
export interface ArxModuleOptions {
  /** The storage adapter (Prisma, Drizzle, or a custom implementation). */
  adapter: StorageAdapter;

  /**
   * Extracts the current user's ID from the incoming HTTP request.
   * Called by ArxGuard on every guarded route.
   *
   * @example
   * // JWT strategy (e.g. Passport JWT populates request.user)
   * getUserId: (req) => req.user?.id
   *
   * @example
   * // API key resolved to a user id earlier in the pipeline
   * getUserId: (req) => req.userId
   */
  getUserId: (request: Record<string, unknown>) => string | undefined;

  /**
   * When true (default), ArxModule is registered as a global module so
   * ArxService and ArxGuard are available across the entire application
   * without importing ArxModule in every feature module.
   */
  isGlobal?: boolean;
}

/**
 * Async variant of ArxModuleOptions for when the adapter or getUserId
 * function depend on asynchronous providers (e.g. ConfigService).
 */
export interface ArxModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => Promise<ArxModuleOptions> | ArxModuleOptions;
  inject?: unknown[];
  isGlobal?: boolean;
}
