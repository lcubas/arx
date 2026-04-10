import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ArxModuleOptions } from './interfaces.js';
import { ArxService } from './arx.service.js';
import { ARX_PERMISSIONS_KEY, ARX_ROLES_KEY } from './tokens.js';

/**
 * Guard that enforces @RequirePermissions() and @RequireRole() decorators.
 *
 * Register it globally via APP_GUARD, or apply it to specific controllers
 * and handlers.
 *
 * @example — global registration (app.module.ts)
 * providers: [{ provide: APP_GUARD, useClass: ArxGuard }]
 *
 * @example — per controller
 * \@UseGuards(ArxGuard)
 * \@Controller('posts')
 * export class PostsController { ... }
 */
export class ArxGuard implements CanActivate {
  constructor(
    private readonly arx: ArxService,
    private readonly reflector: Reflector,
    private readonly options: ArxModuleOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[] | undefined>(
      ARX_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      ARX_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Route has no arx decorators — allow through
    if (!permissions?.length && !roles?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const userId = this.options.getUserId(request);

    if (!userId) throw new UnauthorizedException();

    if (permissions?.length) {
      const allowed = await this.arx.canAll(userId, permissions);
      if (!allowed) throw new ForbiddenException();
    }

    if (roles?.length) {
      const checks = await Promise.all(
        roles.map((role) => this.arx.hasRole(userId, role)),
      );
      if (!checks.some(Boolean)) throw new ForbiddenException();
    }

    return true;
  }
}
