import type { Permission, Role, StorageAdapter } from '@arx/core';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '@arx/core';

// ─── Record shapes ────────────────────────────────────────────────────────────

type ArxRoleRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

type ArxPermissionRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

type ArxRoleWithPermissions = ArxRoleRecord & {
  permissions: Array<{ permission: ArxPermissionRecord }>;
};

// ─── Minimal Prisma client interface ─────────────────────────────────────────
//
// Instead of importing PrismaClient directly (which would force consumers to
// match a specific @prisma/client version at import time), we type only the
// subset of the generated client that PrismaAdapter actually uses.
//
// Pass your generated `new PrismaClient()` instance — it satisfies this
// interface as long as the Arx models are present in your schema.

/**
 * The minimal interface of the Prisma client that `PrismaAdapter` requires.
 *
 * @example
 * import { PrismaClient } from '@prisma/client'
 * import { PrismaAdapter } from '@arx/prisma'
 *
 * const adapter = new PrismaAdapter(new PrismaClient())
 */
export interface PrismaClientForArx {
  arxRole: {
    create(args: { data: { name: string } }): Promise<ArxRoleRecord>;
    findUnique(args: { where: { name: string } }): Promise<ArxRoleRecord | null>;
    delete(args: { where: { name: string } }): Promise<ArxRoleRecord>;
    // Overload 1: plain list (no include)
    findMany(args: { where: { users: { some: { userId: string } } } }): Promise<ArxRoleRecord[]>;
    // Overload 2: with permissions eagerly loaded
    findMany(args: {
      where: { users: { some: { userId: string } } };
      include: { permissions: { include: { permission: true } } };
    }): Promise<ArxRoleWithPermissions[]>;
  };
  arxPermission: {
    create(args: { data: { name: string } }): Promise<ArxPermissionRecord>;
    findUnique(args: { where: { name: string } }): Promise<ArxPermissionRecord | null>;
    delete(args: { where: { name: string } }): Promise<ArxPermissionRecord>;
    findMany(args: {
      where:
        | { roles: { some: { role: { name: string } } } }
        | { users: { some: { userId: string } } };
    }): Promise<ArxPermissionRecord[]>;
  };
  arxRolePermission: {
    upsert(args: {
      where: { roleId_permissionId: { roleId: string; permissionId: string } };
      create: { roleId: string; permissionId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { roleId: string; permissionId: string } }): Promise<unknown>;
    findMany(args: {
      where: { role: { name: string } };
      include: { permission: true };
    }): Promise<Array<{ permission: ArxPermissionRecord }>>;
  };
  arxUserRole: {
    upsert(args: {
      where: { userId_roleId: { userId: string; roleId: string } };
      create: { userId: string; roleId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { userId: string; roleId: string } }): Promise<unknown>;
  };
  arxUserPermission: {
    upsert(args: {
      where: { userId_permissionId: { userId: string; permissionId: string } };
      create: { userId: string; permissionId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { userId: string; permissionId: string } }): Promise<unknown>;
    findMany(args: {
      where: { userId: string };
      include: { permission: true };
    }): Promise<Array<{ permission: ArxPermissionRecord }>>;
  };
}

// ─── Prisma error codes ───────────────────────────────────────────────────────

/** Unique constraint violation — thrown when creating a duplicate record. */
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
/** Record not found — thrown by operations that require an existing record. */
const PRISMA_NOT_FOUND = 'P2025';

function isPrismaError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRole(record: ArxRoleRecord): Role {
  return { id: record.id, name: record.name, createdAt: record.createdAt };
}

function toPermission(record: ArxPermissionRecord): Permission {
  return { id: record.id, name: record.name, createdAt: record.createdAt };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Prisma implementation of the arx `StorageAdapter`.
 *
 * Requires a Prisma client with the Arx models defined in your `schema.prisma`.
 * Copy the reference schema from `node_modules/@arx/prisma/schema.prisma` and
 * run `prisma migrate dev` to apply the tables.
 *
 * @example
 * import { PrismaClient } from '@prisma/client'
 * import { createAuthorization } from '@arx/core'
 * import { PrismaAdapter } from '@arx/prisma'
 *
 * const prisma = new PrismaClient()
 *
 * const { can, assignRole, createRole } = createAuthorization({
 *   adapter: new PrismaAdapter(prisma),
 * })
 */
export class PrismaAdapter implements StorageAdapter {
  constructor(private readonly prisma: PrismaClientForArx) {}

  // ─── Roles ─────────────────────────────────────────────────────────────────

  async createRole(name: string): Promise<Role> {
    try {
      const record = await this.prisma.arxRole.create({ data: { name } });
      return toRole(record);
    } catch (err) {
      if (isPrismaError(err) && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new RoleAlreadyExistsError(name);
      }
      throw err;
    }
  }

  async findRole(name: string): Promise<Role | null> {
    const record = await this.prisma.arxRole.findUnique({ where: { name } });
    return record ? toRole(record) : null;
  }

  async deleteRole(name: string): Promise<void> {
    try {
      await this.prisma.arxRole.delete({ where: { name } });
    } catch (err) {
      if (isPrismaError(err) && err.code === PRISMA_NOT_FOUND) return;
      throw err;
    }
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  async createPermission(name: string): Promise<Permission> {
    try {
      const record = await this.prisma.arxPermission.create({ data: { name } });
      return toPermission(record);
    } catch (err) {
      if (isPrismaError(err) && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new PermissionAlreadyExistsError(name);
      }
      throw err;
    }
  }

  async findPermission(name: string): Promise<Permission | null> {
    const record = await this.prisma.arxPermission.findUnique({ where: { name } });
    return record ? toPermission(record) : null;
  }

  async deletePermission(name: string): Promise<void> {
    try {
      await this.prisma.arxPermission.delete({ where: { name } });
    } catch (err) {
      if (isPrismaError(err) && err.code === PRISMA_NOT_FOUND) return;
      throw err;
    }
  }

  // ─── Role ↔ Permission ─────────────────────────────────────────────────────

  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.prisma.arxRole.findUnique({ where: { name: roleName } }),
      this.prisma.arxPermission.findUnique({ where: { name: permissionName } }),
    ]);

    if (!role) throw new RoleNotFoundError(roleName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    await this.prisma.arxRolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });
  }

  async revokePermissionFromRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.prisma.arxRole.findUnique({ where: { name: roleName } }),
      this.prisma.arxPermission.findUnique({ where: { name: permissionName } }),
    ]);

    // Idempotent — if either side doesn't exist, there's nothing to revoke
    if (!role || !permission) return;

    await this.prisma.arxRolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });
  }

  async getPermissionsForRole(roleName: string): Promise<Permission[]> {
    const rows = await this.prisma.arxRolePermission.findMany({
      where: { role: { name: roleName } },
      include: { permission: true },
    });
    return rows.map((row) => toPermission(row.permission));
  }

  // ─── User ↔ Role ───────────────────────────────────────────────────────────

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.arxRole.findUnique({ where: { name: roleName } });
    if (!role) throw new RoleNotFoundError(roleName);

    await this.prisma.arxUserRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  }

  async revokeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.arxRole.findUnique({ where: { name: roleName } });
    if (!role) return; // Idempotent

    await this.prisma.arxUserRole.deleteMany({ where: { userId, roleId: role.id } });
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const records = await this.prisma.arxRole.findMany({
      where: { users: { some: { userId } } },
    });
    return records.map(toRole);
  }

  // ─── User ↔ Permission (direct) ────────────────────────────────────────────

  async grantPermissionToUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.prisma.arxPermission.findUnique({
      where: { name: permissionName },
    });
    if (!permission) throw new PermissionNotFoundError(permissionName);

    await this.prisma.arxUserPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      create: { userId, permissionId: permission.id },
      update: {},
    });
  }

  async revokePermissionFromUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.prisma.arxPermission.findUnique({
      where: { name: permissionName },
    });
    if (!permission) return; // Idempotent

    await this.prisma.arxUserPermission.deleteMany({
      where: { userId, permissionId: permission.id },
    });
  }

  async getDirectPermissionsForUser(userId: string): Promise<Permission[]> {
    const rows = await this.prisma.arxUserPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    return rows.map((row) => toPermission(row.permission));
  }

  // ─── Optional optimization ─────────────────────────────────────────────────

  /**
   * Resolve all effective permissions for a user in two parallel queries:
   * one for direct grants, one for role-inherited permissions.
   *
   * Deduplication is done by permission ID — if the same permission is
   * granted both directly and via a role, it appears only once.
   */
  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const [directRows, roles] = await Promise.all([
      this.prisma.arxUserPermission.findMany({
        where: { userId },
        include: { permission: true },
      }),
      this.prisma.arxRole.findMany({
        where: { users: { some: { userId } } },
        include: { permissions: { include: { permission: true } } },
      }),
    ]);

    const seen = new Set<string>();
    const result: Permission[] = [];

    const collect = (record: ArxPermissionRecord) => {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        result.push(toPermission(record));
      }
    };

    for (const row of directRows) collect(row.permission);
    for (const role of roles) {
      for (const rp of role.permissions) collect(rp.permission);
    }

    return result;
  }
}
