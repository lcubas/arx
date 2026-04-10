import type { Permission, Role, StorageAdapter } from '@arx/core';
import {
  PermissionAlreadyExistsError,
  PermissionNotFoundError,
  RoleAlreadyExistsError,
  RoleNotFoundError,
} from '@arx/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type RoleRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

type PermissionRecord = {
  id: string;
  name: string;
  createdAt: Date;
};

type RoleWithPermissions = RoleRecord & {
  permissions: Array<{ permission: PermissionRecord }>;
};

/**
 * The minimal interface of the Prisma client that `PrismaAdapter` requires.
 * Instead of importing PrismaClient directly (which would force consumers to
 * match a specific @prisma/client version at import time), we type only the
 * subset of the generated client that PrismaAdapter actually uses.
 * Pass your generated `new PrismaClient()` instance — it satisfies this
 * interface as long as the Arx models are present in your schema.
 *
 * @example
 * import { PrismaClient } from '@prisma/client'
 * import { PrismaAdapter } from '@arx/prisma'
 *
 * const adapter = new PrismaAdapter(new PrismaClient())
 */
export interface PrismaClientForArx {
  role: {
    create(args: { data: { name: string } }): Promise<RoleRecord>;
    findUnique(args: { where: { name: string } }): Promise<RoleRecord | null>;
    delete(args: { where: { name: string } }): Promise<RoleRecord>;
    // More-specific overload first: with include → returns full shape
    findMany(args: {
      where: { users: { some: { userId: string } } };
      include: { permissions: { include: { permission: true } } };
    }): Promise<RoleWithPermissions[]>;
    // Fallback: without include → plain records
    findMany(args: {
      where: { users: { some: { userId: string } } };
    }): Promise<RoleRecord[]>;
  };
  permission: {
    create(args: { data: { name: string } }): Promise<PermissionRecord>;
    findUnique(args: { where: { name: string } }): Promise<PermissionRecord | null>;
    delete(args: { where: { name: string } }): Promise<PermissionRecord>;
  };
  rolePermission: {
    upsert(args: {
      where: { roleId_permissionId: { roleId: string; permissionId: string } };
      create: { roleId: string; permissionId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { roleId: string; permissionId: string } }): Promise<unknown>;
    findMany(args: {
      where: { role: { name: string } };
      include: { permission: true };
    }): Promise<Array<{ permission: PermissionRecord }>>;
  };
  userRole: {
    upsert(args: {
      where: { userId_roleId: { userId: string; roleId: string } };
      create: { userId: string; roleId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { userId: string; roleId: string } }): Promise<unknown>;
  };
  userPermission: {
    upsert(args: {
      where: { userId_permissionId: { userId: string; permissionId: string } };
      create: { userId: string; permissionId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
    deleteMany(args: { where: { userId: string; permissionId: string } }): Promise<unknown>;
    findMany(args: {
      where: { userId: string };
      include: { permission: true };
    }): Promise<Array<{ permission: PermissionRecord }>>;
  };
}

// Prisma error codes

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const PRISMA_NOT_FOUND = 'P2025';

// Helpers

function toRole(record: RoleRecord): Role {
  return { id: record.id, name: record.name, createdAt: record.createdAt };
}

function toPermission(record: PermissionRecord): Permission {
  return { id: record.id, name: record.name, createdAt: record.createdAt };
}

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

  async createRole(name: string): Promise<Role> {
    try {
      const record = await this.prisma.role.create({ data: { name } });
      return toRole(record);
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new RoleAlreadyExistsError(name);
      }
      throw err;
    }
  }

  async findRole(name: string): Promise<Role | null> {
    const record = await this.prisma.role.findUnique({ where: { name } });
    return record ? toRole(record) : null;
  }

  async deleteRole(name: string): Promise<void> {
    try {
      await this.prisma.role.delete({ where: { name } });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === PRISMA_NOT_FOUND) {
        return;
      }
      throw err;
    }
  }

  async createPermission(name: string): Promise<Permission> {
    try {
      const record = await this.prisma.permission.create({ data: { name } });
      return toPermission(record);
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new PermissionAlreadyExistsError(name);
      }
      throw err;
    }
  }

  async findPermission(name: string): Promise<Permission | null> {
    const record = await this.prisma.permission.findUnique({ where: { name } });
    return record ? toPermission(record) : null;
  }

  async deletePermission(name: string): Promise<void> {
    try {
      await this.prisma.permission.delete({ where: { name } });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === PRISMA_NOT_FOUND) {
        return;
      }
      throw err;
    }
  }

  async grantPermissionToRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { name: roleName } }),
      this.prisma.permission.findUnique({ where: { name: permissionName } }),
    ]);

    if (!role) throw new RoleNotFoundError(roleName);
    if (!permission) throw new PermissionNotFoundError(permissionName);

    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });
  }

  async revokePermissionFromRole(roleName: string, permissionName: string): Promise<void> {
    const [role, permission] = await Promise.all([
      this.prisma.role.findUnique({ where: { name: roleName } }),
      this.prisma.permission.findUnique({ where: { name: permissionName } }),
    ]);

    // Idempotent — if either side doesn't exist, there's nothing to revoke
    if (!role || !permission) return;

    await this.prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });
  }

  async getPermissionsForRole(roleName: string): Promise<Permission[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role: { name: roleName } },
      include: { permission: true },
    });
    return rows.map((row) => toPermission(row.permission));
  }

  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new RoleNotFoundError(roleName);

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  }

  async revokeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return; // Idempotent

    await this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id } });
  }

  async getRolesForUser(userId: string): Promise<Role[]> {
    const records = await this.prisma.role.findMany({
      where: { users: { some: { userId } } },
    });
    return records.map(toRole);
  }

  async grantPermissionToUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { name: permissionName } });
    if (!permission) throw new PermissionNotFoundError(permissionName);

    await this.prisma.userPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      create: { userId, permissionId: permission.id },
      update: {},
    });
  }

  async revokePermissionFromUser(userId: string, permissionName: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { name: permissionName } });
    if (!permission) return; // Idempotent

    await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId: permission.id },
    });
  }

  async getDirectPermissionsForUser(userId: string): Promise<Permission[]> {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    return rows.map((row) => toPermission(row.permission));
  }

  /**
   * Resolve all effective permissions for a user in two parallel queries:
   * one for direct grants, one for role-inherited permissions.
   *
   * Deduplication is done by permission ID — if the same permission is
   * granted both directly and via a role, it appears only once.
   */
  async getEffectivePermissions(userId: string): Promise<Permission[]> {
    const [directRows, roles] = await Promise.all([
      this.prisma.userPermission.findMany({
        where: { userId },
        include: { permission: true },
      }),
      this.prisma.role.findMany({
        where: { users: { some: { userId } } },
        include: { permissions: { include: { permission: true } } },
      }),
    ]);

    const seen = new Set<string>();
    const result: Permission[] = [];

    const collect = (record: PermissionRecord) => {
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
