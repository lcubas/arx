import { SetMetadata } from '@nestjs/common';
import { ARX_PERMISSIONS_KEY, ARX_ROLES_KEY } from './tokens';

/**
 * Requires the current user to hold ALL of the specified permissions.
 * Can be applied at controller or handler level — handler takes precedence.
 *
 * @example
 * \@Get('publish')
 * \@RequirePermissions('post:publish')
 * publish() { ... }
 *
 * @example
 * \@Post('admin-action')
 * \@RequirePermissions('admin:read', 'admin:write')
 * adminAction() { ... }
 */
export const RequirePermissions = (...permissions: [string, ...string[]]) =>
  SetMetadata(ARX_PERMISSIONS_KEY, permissions);

/**
 * Requires the current user to hold AT LEAST ONE of the specified roles.
 * Can be applied at controller or handler level — handler takes precedence.
 *
 * @example
 * \@Get('dashboard')
 * \@RequireRole('admin', 'moderator')
 * dashboard() { ... }
 */
export const RequireRole = (...roles: [string, ...string[]]) =>
  SetMetadata(ARX_ROLES_KEY, roles);
