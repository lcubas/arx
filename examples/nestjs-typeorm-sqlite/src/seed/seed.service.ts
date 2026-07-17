// biome-ignore lint/style/useImportType: must stay a value import — Nest's DI reflection needs the real class reference at runtime.
import { ArxService } from '@arxjs/nestjs';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly arx: ArxService) {}

  async run() {
    this.logger.log('Seeding roles, permissions and users...');

    // Create all permissions up front
    await Promise.all([
      this.arx.createPermission('posts:create', { ifExists: 'ignore' }),
      this.arx.createPermission('posts:read', { ifExists: 'ignore' }),
      this.arx.createPermission('posts:update', { ifExists: 'ignore' }),
      this.arx.createPermission('posts:delete', { ifExists: 'ignore' }),
      this.arx.createPermission('users:manage', { ifExists: 'ignore' }),
    ]);

    // Create roles with their permissions
    await this.arx.createRole('admin', {
      ifExists: 'ignore',
      permissions: ['posts:create', 'posts:read', 'posts:update', 'posts:delete', 'users:manage'],
    });

    await this.arx.createRole('editor', {
      ifExists: 'ignore',
      permissions: ['posts:create', 'posts:read', 'posts:update'],
    });

    await this.arx.createRole('viewer', {
      ifExists: 'ignore',
      permissions: ['posts:read'],
    });

    // Assign roles to test users
    await this.arx.assignRole('user-1', 'admin'); // full access
    await this.arx.assignRole('user-2', 'editor'); // create + read + update
    await this.arx.assignRole('user-3', 'viewer'); // read only

    this.logger.log('Seed complete.');
  }
}
