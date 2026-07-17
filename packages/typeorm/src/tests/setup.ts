import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ARX_TYPEORM_ENTITIES } from '../entities';

/**
 * Creates a fresh in-memory SQLite DataSource with the arx entities
 * registered and synchronized. Call `initialize()` before use and
 * `destroy()` after each test to keep state isolated.
 */
export function createTestDataSource(): DataSource {
  return new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [...ARX_TYPEORM_ENTITIES],
    synchronize: true,
    dropSchema: true,
  });
}
