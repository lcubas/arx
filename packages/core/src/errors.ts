/**
 * Typed error classes for arx.
 *
 * All errors extend ArxError so consumers can catch the entire
 * arx error family with a single `instanceof ArxError` check,
 * or handle specific errors individually.
 *
 * Each error class exposes the relevant context (e.g. `roleName`)
 * as a typed property, so callers never need to parse error messages.
 *
 * @example
 * try {
 *   await createRole('admin')
 * } catch (err) {
 *   if (err instanceof RoleAlreadyExistsError) {
 *     console.log(err.roleName) // 'admin'
 *   }
 * }
 */

/**
 * Base class for all arx errors.
 */
export class ArxError extends Error {
  override readonly name: string = 'ArxError';

  constructor(message: string) {
    super(message);
    // Restore prototype chain — required for correct instanceof checks
    // when the output is consumed in environments that transpile classes.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Role errors ─────────────────────────────────────────────────────────────

/**
 * Thrown when a role is looked up by name and does not exist.
 */
export class RoleNotFoundError extends ArxError {
  override readonly name = 'RoleNotFoundError';
  readonly roleName: string;

  constructor(roleName: string) {
    super(`Role '${roleName}' not found.`);
    this.roleName = roleName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when attempting to create a role that already exists.
 * Pass `{ ifExists: 'ignore' }` to `createRole` to suppress this error.
 */
export class RoleAlreadyExistsError extends ArxError {
  override readonly name = 'RoleAlreadyExistsError';
  readonly roleName: string;

  constructor(roleName: string) {
    super(`Role '${roleName}' already exists.`);
    this.roleName = roleName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Permission errors ────────────────────────────────────────────────────────

/**
 * Thrown when a permission is looked up by name and does not exist.
 */
export class PermissionNotFoundError extends ArxError {
  override readonly name = 'PermissionNotFoundError';
  readonly permissionName: string;

  constructor(permissionName: string) {
    super(`Permission '${permissionName}' not found.`);
    this.permissionName = permissionName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when attempting to create a permission that already exists.
 * Pass `{ ifExists: 'ignore' }` to `createPermission` to suppress this error.
 */
export class PermissionAlreadyExistsError extends ArxError {
  override readonly name = 'PermissionAlreadyExistsError';
  readonly permissionName: string;

  constructor(permissionName: string) {
    super(`Permission '${permissionName}' already exists.`);
    this.permissionName = permissionName;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
