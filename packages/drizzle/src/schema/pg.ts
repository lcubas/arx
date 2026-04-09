import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: text('user_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const userPermissions = pgTable(
  'user_permissions',
  {
    userId: text('user_id').notNull(),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permissionId] })],
);

/**
 * Pass this object to `DrizzleAdapter` when using PostgreSQL.
 *
 * @example
 * import { drizzle } from 'drizzle-orm/postgres-js'
 * import { schema } from '@arx/drizzle/schema/pg'
 * import { DrizzleAdapter } from '@arx/drizzle'
 *
 * const db = drizzle(client)
 * const adapter = new DrizzleAdapter(db, schema)
 */
export const schema = { roles, permissions, rolePermissions, userRoles, userPermissions };
