import { randomUUID } from 'node:crypto';
import type { Permission, Role, StorageAdapter } from '@arxjs/core';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '@arxjs/core';
import type { Column } from 'drizzle-orm';
import { and, eq } from 'drizzle-orm';

// Schema type
//
// ArxDrizzleSchema describes the shape that the schema objects exported from
// @arxjs/drizzle/schema/pg, /schema/mysql, and /schema/sqlite all conform to.
//
// Using `Column` (the drizzle-orm base type) lets us pass these fields directly
// to `eq()` without casts, while remaining compatible with all three dialects.
// The wider type safety lives in the dialect schema files and the StorageAdapter
// interface that constrains all return values.

export type ArxDrizzleSchema = {
  roles: {
    id: Column;
    name: Column;
    createdAt: Column;
  };
  permissions: {
    id: Column;
    name: Column;
    createdAt: Column;
  };
  rolePermissions: {
    roleId: Column;
    permissionId: Column;
  };
  userRoles: {
    userId: Column;
    roleId: Column;
  };
  userPermissions: {
    userId: Column;
    permissionId: Column;
  };
};

// Database type
//
// AnyDrizzleDB is a structural interface satisfied by the db instances returned
// by drizzle() for all supported dialects (postgres-js, mysql2, better-sqlite3,
// libsql, etc.). We intentionally use a loose structural type — real safety is
// enforced by the dialect-specific adapters and the StorageAdapter contract.

// biome-ignore lint/suspicious/noExplicitAny: intentional — dialect-agnostic db wrapper
export type AnyDrizzleDB = Record<string, any>;

type RoleRow = { id: string; name: string; createdAt: Date };
type PermissionRow = { id: string; name: string; createdAt: Date };

// Drizzle passes driver errors through largely unchanged, and the adapter is
// dialect-agnostic (it doesn't know whether `db` wraps node-postgres,
// postgres.js, mysql2, better-sqlite3, or libsql). We check the common
// unique/primary-key-violation codes across all of them so a single insert
// path works everywhere, instead of hand-rolling a find-then-insert race.
function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; errno?: number };
  return (
    e.code === '23505' || // PostgreSQL (node-postgres, postgres.js)
    e.code === 'ER_DUP_ENTRY' || // MySQL / MariaDB (mysql2)
    e.errno === 1062 || // MySQL alternate
    e.code === 'SQLITE_CONSTRAINT_UNIQUE' || // SQLite (better-sqlite3, libsql)
    e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
    e.code === 'SQLITE_CONSTRAINT' // SQLite (generic/older)
  );
}

function toRole(row: RoleRow): Role {
  return { id: row.id, name: row.name, createdAt: row.createdAt };
}

function toPermission(row: PermissionRow): Permission {
  return { id: row.id, name: row.name, createdAt: row.createdAt };
}

/**
 * Abstract base class for all Drizzle ORM adapters.
 *
 * Contains all query logic shared across dialects. Each dialect subclass
 * (`DrizzlePgAdapter`, `DrizzleMysqlAdapter`, `DrizzleSqliteAdapter`) calls
 * `super(db, schema)` with its own pre-bundled schema — callers never need
 * to pass a schema object directly.
 */
export abstract class DrizzleAdapter implements StorageAdapter {
  protected constructor(
    protected readonly db: AnyDrizzleDB,
    protected readonly tables: ArxDrizzleSchema,
  ) {}

  async createRole(name: string): Promise<Role> {
    const id = randomUUID();
    const createdAt = new Date();

    try {
      await this.db.insert(this.tables.roles).values({ id, name, createdAt });
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new RoleAlreadyExistsError(name);
      throw err;
    }

    return { id, name, createdAt };
  }

  async findRole(name: string): Promise<Role | null> {
    const [row] = (await this.db
      .select({
        id: this.tables.roles.id,
        name: this.tables.roles.name,
        createdAt: this.tables.roles.createdAt,
      })
      .from(this.tables.roles)
      .where(eq(this.tables.roles.name, name))
      .limit(1)) as RoleRow[];

    return row ? toRole(row) : null;
  }

  async deleteRole(name: string): Promise<void> {
    await this.db.delete(this.tables.roles).where(eq(this.tables.roles.name, name));
  }

  async createPermission(name: string): Promise<Permission> {
    const id = randomUUID();
    const createdAt = new Date();

    try {
      await this.db.insert(this.tables.permissions).values({ id, name, createdAt });
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new PermissionAlreadyExistsError(name);
      throw err;
    }

    return { id, name, createdAt };
  }

  async findPermission(name: string): Promise<Permission | null> {
    const [row] = (await this.db
      .select({
        id: this.tables.permissions.id,
        name: this.tables.permissions.name,
        createdAt: this.tables.permissions.createdAt,
      })
      .from(this.tables.permissions)
      .where(eq(this.tables.permissions.name, name))
      .limit(1)) as PermissionRow[];

    return row ? toPermission(row) : null;
  }

  async deletePermission(name: string): Promise<void> {
    await this.db.delete(this.tables.permissions).where(eq(this.tables.permissions.name, name));
  }

  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.findRole(roleName),
      this.findPermission(permissionName),
    ]);

    if (!role) throw new RoleNotFoundError(roleName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    try {
      await this.db
        .insert(this.tables.rolePermissions)
        .values({ roleId: role.id, permissionId: permission.id, assignedAt: new Date() });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err; // already granted — idempotent
    }
  }

  async revokePermissionFromRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.findRole(roleName),
      this.findPermission(permissionName),
    ]);

    if (!role || !permission) return; // Idempotent

    await this.db
      .delete(this.tables.rolePermissions)
      .where(
        and(
          eq(this.tables.rolePermissions.roleId, role.id),
          eq(this.tables.rolePermissions.permissionId, permission.id),
        ),
      );
  }

  async getPermissionsForRole(roleName: string): Promise<Permission[]> {
    const role = await this.findRole(roleName);
    if (!role) return [];

    const rows = (await this.db
      .select({
        id: this.tables.permissions.id,
        name: this.tables.permissions.name,
        createdAt: this.tables.permissions.createdAt,
      })
      .from(this.tables.rolePermissions)
      .innerJoin(
        this.tables.permissions,
        eq(this.tables.rolePermissions.permissionId, this.tables.permissions.id),
      )
      .where(eq(this.tables.rolePermissions.roleId, role.id))) as PermissionRow[];

    return rows.map(toPermission);
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.findRole(roleName);
    if (!role) throw new RoleNotFoundError(roleName);

    try {
      await this.db
        .insert(this.tables.userRoles)
        .values({ userId, roleId: role.id, assignedAt: new Date() });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err; // already assigned — idempotent
    }
  }

  async revokeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const role = await this.findRole(roleName);
    if (!role) return; // Idempotent

    await this.db
      .delete(this.tables.userRoles)
      .where(
        and(eq(this.tables.userRoles.userId, userId), eq(this.tables.userRoles.roleId, role.id)),
      );
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const rows = (await this.db
      .select({
        id: this.tables.roles.id,
        name: this.tables.roles.name,
        createdAt: this.tables.roles.createdAt,
      })
      .from(this.tables.userRoles)
      .innerJoin(this.tables.roles, eq(this.tables.userRoles.roleId, this.tables.roles.id))
      .where(eq(this.tables.userRoles.userId, userId))) as RoleRow[];

    return rows.map(toRole);
  }

  async grantPermissionToUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.findPermission(permissionName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    try {
      await this.db
        .insert(this.tables.userPermissions)
        .values({ userId, permissionId: permission.id, assignedAt: new Date() });
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err; // already granted — idempotent
    }
  }

  async revokePermissionFromUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.findPermission(permissionName);
    if (!permission) return; // Idempotent

    await this.db
      .delete(this.tables.userPermissions)
      .where(
        and(
          eq(this.tables.userPermissions.userId, userId),
          eq(this.tables.userPermissions.permissionId, permission.id),
        ),
      );
  }

  async getDirectPermissionsForUser(userId: string): Promise<Permission[]> {
    const rows = (await this.db
      .select({
        id: this.tables.permissions.id,
        name: this.tables.permissions.name,
        createdAt: this.tables.permissions.createdAt,
      })
      .from(this.tables.userPermissions)
      .innerJoin(
        this.tables.permissions,
        eq(this.tables.userPermissions.permissionId, this.tables.permissions.id),
      )
      .where(eq(this.tables.userPermissions.userId, userId))) as PermissionRow[];

    return rows.map(toPermission);
  }

  /**
   * Resolve all effective permissions for a user in two parallel queries:
   * one for direct grants, one for role-inherited permissions (via a join
   * through user_roles → role_permissions → permissions).
   *
   * Deduplication is done by permission ID.
   */
  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const [directRows, inheritedRows] = (await Promise.all([
      // Direct permissions
      this.db
        .select({
          id: this.tables.permissions.id,
          name: this.tables.permissions.name,
          createdAt: this.tables.permissions.createdAt,
        })
        .from(this.tables.userPermissions)
        .innerJoin(
          this.tables.permissions,
          eq(this.tables.userPermissions.permissionId, this.tables.permissions.id),
        )
        .where(eq(this.tables.userPermissions.userId, userId)),

      // Role-inherited permissions
      this.db
        .select({
          id: this.tables.permissions.id,
          name: this.tables.permissions.name,
          createdAt: this.tables.permissions.createdAt,
        })
        .from(this.tables.userRoles)
        .innerJoin(
          this.tables.rolePermissions,
          eq(this.tables.userRoles.roleId, this.tables.rolePermissions.roleId),
        )
        .innerJoin(
          this.tables.permissions,
          eq(this.tables.rolePermissions.permissionId, this.tables.permissions.id),
        )
        .where(eq(this.tables.userRoles.userId, userId)),
    ])) as [PermissionRow[], PermissionRow[]];

    const seen = new Set<string>();
    const result: Permission[] = [];

    const collect = (row: PermissionRow) => {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        result.push(toPermission(row));
      }
    };

    for (const row of directRows) collect(row);
    for (const row of inheritedRows) collect(row);

    return result;
  }
}
