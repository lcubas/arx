/**
 * Core domain entities for arx.
 *
 * These are pure data shapes. They carry no methods, no ORM decorators,
 * and no framework coupling. Adapters return these types; the engine
 * consumes them. Developers interact with them via the public API.
 */

/**
 * A named group of permissions that can be assigned to users.
 */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
}

/**
 * A named capability. Recommended format: `action:resource`
 * e.g. `edit:post`, `delete:comment`, `publish:article`.
 *
 * The format is not validated at runtime — any string is accepted.
 */
export interface Permission {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
}

/**
 * Records that a role has been assigned to a user.
 */
export interface RoleAssignment {
  readonly userId: string;
  readonly roleId: string;
  readonly assignedAt: Date;
}

/**
 * Records that a permission has been assigned directly to a user
 * (not via a role).
 */
export interface PermissionAssignment {
  readonly userId: string;
  readonly permissionId: string;
  readonly assignedAt: Date;
}

/**
 * Records that a permission has been granted to a role.
 */
export interface RolePermissionAssignment {
  readonly roleId: string;
  readonly permissionId: string;
  readonly assignedAt: Date;
}
