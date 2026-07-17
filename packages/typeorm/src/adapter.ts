import { randomUUID } from 'node:crypto';
import type { Permission, Role, StorageAdapter } from '@arxjs/core';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '@arxjs/core';
import type { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import {
  ArxPermission,
  ArxRole,
  ArxRolePermission,
  ArxUserPermission,
  ArxUserRole,
} from './entities';

// TypeORM wraps all DB errors in QueryFailedError. The `code` field holds the
// driver-specific error code — we check all common unique/primary-key-constraint
// codes so the adapter works across PostgreSQL, MySQL, SQLite, and SQL Server.
// SQLite (and SQL Server) report a *different* code for a composite primary-key
// violation (the junction tables) than for a plain UNIQUE column violation
// (roles.name / permissions.name) — both must be covered.
function isUniqueConstraintError(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const e = err as QueryFailedError & {
    code?: string;
    errno?: number;
    number?: number;
  };
  return (
    e.code === '23505' || // PostgreSQL
    e.code === 'ER_DUP_ENTRY' || // MySQL / MariaDB
    e.code === 'SQLITE_CONSTRAINT' || // SQLite (generic/older)
    e.code === 'SQLITE_CONSTRAINT_UNIQUE' || // SQLite — UNIQUE column violation
    e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || // SQLite — PRIMARY KEY violation
    e.errno === 1062 || // MySQL alternate
    e.number === 2627 || // SQL Server — PRIMARY KEY violation
    e.number === 2601 // SQL Server — duplicate key row in unique index
  );
}

function toRole(entity: ArxRole): Role {
  return { id: entity.id, name: entity.name, createdAt: entity.createdAt };
}

function toPermission(entity: ArxPermission): Permission {
  return { id: entity.id, name: entity.name, createdAt: entity.createdAt };
}

/**
 * TypeORM implementation of the arx `StorageAdapter`.
 *
 * Requires a TypeORM `DataSource` with the five arx entities registered.
 * Use `ARX_TYPEORM_ENTITIES` for convenience:
 *
 * @example
 * import 'reflect-metadata'
 * import { DataSource } from 'typeorm'
 * import { createAuthorization } from '@arxjs/core'
 * import { TypeOrmAdapter, ARX_TYPEORM_ENTITIES } from '@arxjs/typeorm'
 *
 * const dataSource = new DataSource({
 *   type: 'postgres',
 *   url: process.env.DATABASE_URL,
 *   entities: [...ARX_TYPEORM_ENTITIES],
 *   synchronize: true, // use migrations in production
 * })
 *
 * await dataSource.initialize()
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new TypeOrmAdapter(dataSource),
 * })
 */
export class TypeOrmAdapter implements StorageAdapter {
  constructor(private readonly dataSource: DataSource) {}

  async createRole(name: string): Promise<Role> {
    const repo = this.dataSource.getRepository(ArxRole);
    const entity = repo.create({ id: randomUUID(), name, createdAt: new Date() });

    try {
      const saved = await repo.save(entity);
      return toRole(saved);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new RoleAlreadyExistsError(name);
      throw err;
    }
  }

  async findRole(name: string): Promise<Role | null> {
    const entity = await this.dataSource.getRepository(ArxRole).findOneBy({ name });
    return entity ? toRole(entity) : null;
  }

  async deleteRole(name: string): Promise<void> {
    await this.dataSource.getRepository(ArxRole).delete({ name });
  }

  async createPermission(name: string): Promise<Permission> {
    const repo = this.dataSource.getRepository(ArxPermission);
    const entity = repo.create({ id: randomUUID(), name, createdAt: new Date() });

    try {
      const saved = await repo.save(entity);
      return toPermission(saved);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new PermissionAlreadyExistsError(name);
      throw err;
    }
  }

  async findPermission(name: string): Promise<Permission | null> {
    const entity = await this.dataSource.getRepository(ArxPermission).findOneBy({ name });
    return entity ? toPermission(entity) : null;
  }

  async deletePermission(name: string): Promise<void> {
    await this.dataSource.getRepository(ArxPermission).delete({ name });
  }

  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.findRole(roleName),
      this.findPermission(permissionName),
    ]);

    if (!role) throw new RoleNotFoundError(roleName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    const repo = this.dataSource.getRepository(ArxRolePermission);

    try {
      await repo.save(repo.create({ roleId: role.id, permissionId: permission.id }));
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

    await this.dataSource
      .getRepository(ArxRolePermission)
      .delete({ roleId: role.id, permissionId: permission.id });
  }

  async getPermissionsForRole(roleName: string): Promise<Permission[]> {
    const role = await this.findRole(roleName);
    if (!role) return [];

    const rows = await this.dataSource
      .getRepository(ArxPermission)
      .createQueryBuilder('p')
      .innerJoin(ArxRolePermission, 'rp', 'rp.permissionId = p.id')
      .where('rp.roleId = :roleId', { roleId: role.id })
      .getMany();

    return rows.map(toPermission);
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.findRole(roleName);
    if (!role) throw new RoleNotFoundError(roleName);

    const repo = this.dataSource.getRepository(ArxUserRole);

    try {
      await repo.save(repo.create({ userId, roleId: role.id }));
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err; // already assigned — idempotent
    }
  }

  async revokeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const role = await this.findRole(roleName);
    if (!role) return; // Idempotent

    await this.dataSource.getRepository(ArxUserRole).delete({ userId, roleId: role.id });
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const rows = await this.dataSource
      .getRepository(ArxRole)
      .createQueryBuilder('r')
      .innerJoin(ArxUserRole, 'ur', 'ur.roleId = r.id')
      .where('ur.userId = :userId', { userId })
      .getMany();

    return rows.map(toRole);
  }

  async grantPermissionToUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.findPermission(permissionName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    const repo = this.dataSource.getRepository(ArxUserPermission);

    try {
      await repo.save(repo.create({ userId, permissionId: permission.id }));
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err; // already granted — idempotent
    }
  }

  async revokePermissionFromUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.findPermission(permissionName);
    if (!permission) return; // Idempotent

    await this.dataSource
      .getRepository(ArxUserPermission)
      .delete({ userId, permissionId: permission.id });
  }

  async getDirectPermissionsForUser(userId: string): Promise<Permission[]> {
    const rows = await this.dataSource
      .getRepository(ArxPermission)
      .createQueryBuilder('p')
      .innerJoin(ArxUserPermission, 'up', 'up.permissionId = p.id')
      .where('up.userId = :userId', { userId })
      .getMany();

    return rows.map(toPermission);
  }

  /**
   * Resolves all effective permissions for a user in two parallel queries:
   * one for direct grants, one for role-inherited permissions.
   *
   * Deduplication is done by permission ID.
   */
  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const permRepo = this.dataSource.getRepository(ArxPermission);

    const [directRows, inheritedRows] = await Promise.all([
      // Direct grants
      permRepo
        .createQueryBuilder('p')
        .innerJoin(ArxUserPermission, 'up', 'up.permissionId = p.id')
        .where('up.userId = :userId', { userId })
        .getMany(),

      // Role-inherited permissions (user_roles → role_permissions → permissions)
      permRepo
        .createQueryBuilder('p')
        .innerJoin(ArxRolePermission, 'rp', 'rp.permissionId = p.id')
        .innerJoin(ArxUserRole, 'ur', 'ur.roleId = rp.roleId')
        .where('ur.userId = :userId', { userId })
        .getMany(),
    ]);

    const seen = new Set<string>();
    const result: Permission[] = [];

    const collect = (entity: ArxPermission) => {
      if (!seen.has(entity.id)) {
        seen.add(entity.id);
        result.push(toPermission(entity));
      }
    };

    for (const p of directRows) collect(p);
    for (const p of inheritedRows) collect(p);

    return result;
  }
}
