import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// SQLite stores timestamps as integers (Unix ms). Drizzle handles the
// Date - integer conversion automatically with { mode: 'timestamp_ms' }.

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRoles = sqliteTable(
  'user_roles',
  {
    userId: text('user_id').notNull(),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const userPermissions = sqliteTable(
  'user_permissions',
  {
    userId: text('user_id').notNull(),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    assignedAt: integer('assigned_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permissionId] })],
);

/**
 * Pass this object to `DrizzleAdapter` when using SQLite.
 *
 * @example
 * import { drizzle } from 'drizzle-orm/better-sqlite3'
 * import { schema } from '@arx/drizzle/schema/sqlite'
 * import { DrizzleAdapter } from '@arx/drizzle'
 *
 * const db = drizzle(client)
 * const adapter = new DrizzleAdapter(db, schema)
 */
export const schema = { roles, permissions, rolePermissions, userRoles, userPermissions };
