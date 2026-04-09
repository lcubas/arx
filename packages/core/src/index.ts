/**
 * @arx/core — Modern authorization library for Node.js and TypeScript.
 *
 * This package exports:
 * - Domain entity types (`Role`, `Permission`, assignment types)
 * - Typed error classes (`ArxError`, `RoleNotFoundError`, etc.)
 * - The `StorageAdapter` contract (implement this to build a custom adapter)
 * - Operation option types (`CreateRoleOptions`, `CreatePermissionOptions`)
 * - `InMemoryAdapter` (reference implementation for tests)
 *
 * @packageDocumentation
 */

// ─── Domain entities ───────────────────────────────────────────────────────
export type {
  Permission,
  PermissionAssignment,
  Role,
  RoleAssignment,
  RolePermissionAssignment,
} from './types.js';

// ─── Errors ────────────────────────────────────────────────────────────────
export {
  ArxError,
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from './errors.js';

// ─── Adapter contract ──────────────────────────────────────────────────────
export type { StorageAdapter } from './adapter.js';

// ─── Operation options ─────────────────────────────────────────────────────
export type { CreatePermissionOptions, CreateRoleOptions } from './engine.js';

// ─── Testing adapter ───────────────────────────────────────────────────────
export { InMemoryAdapter } from './in-memory-adapter.js';
