import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { schema } from '../schema/sqlite';

// Mirrors packages/drizzle/src/schema/sqlite.ts. There are no generated
// migrations for this schema (it's push-only, per the adapter's own docs),
// so the DDL below is written by hand and must be kept in sync.
const DDL = `
  CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id)
  );

  CREATE TABLE user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id)
  );

  CREATE TABLE user_permissions (
    user_id TEXT NOT NULL,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, permission_id)
  );
`;

/**
 * Creates a fresh in-memory SQLite database with the arx schema applied,
 * wrapped in a Drizzle instance. Call once per test.
 */
export function createTestDb(): { db: ReturnType<typeof drizzle> } {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(DDL);
  const db = drizzle(sqlite, { schema });
  return { db };
}
