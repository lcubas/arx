import { datetime, mysqlTable, primaryKey, varchar } from 'drizzle-orm/mysql-core';

// MySQL uses varchar for indexed/unique text columns and datetime for timestamps.

export const roles = mysqlTable('roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: datetime('created_at')
    .notNull()
    .default(new Date(0))
    .$defaultFn(() => new Date()),
});

export const permissions = mysqlTable('permissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: datetime('created_at')
    .notNull()
    .default(new Date(0))
    .$defaultFn(() => new Date()),
});

export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    roleId: varchar('role_id', { length: 36 }).notNull(),
    permissionId: varchar('permission_id', { length: 36 }).notNull(),
    assignedAt: datetime('assigned_at')
      .notNull()
      .default(new Date(0))
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: varchar('user_id', { length: 255 }).notNull(),
    roleId: varchar('role_id', { length: 36 }).notNull(),
    assignedAt: datetime('assigned_at')
      .notNull()
      .default(new Date(0))
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const userPermissions = mysqlTable(
  'user_permissions',
  {
    userId: varchar('user_id', { length: 255 }).notNull(),
    permissionId: varchar('permission_id', { length: 36 }).notNull(),
    assignedAt: datetime('assigned_at')
      .notNull()
      .default(new Date(0))
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permissionId] })],
);

/**
 * Pass this object to `DrizzleAdapter` when using MySQL.
 *
 * @example
 * import { drizzle } from 'drizzle-orm/mysql2'
 * import { schema } from '@arx/drizzle/schema/mysql'
 * import { DrizzleAdapter } from '@arx/drizzle'
 *
 * const db = drizzle(client)
 * const adapter = new DrizzleAdapter(db, schema)
 */
export const schema = { roles, permissions, rolePermissions, userRoles, userPermissions };
