import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArxGuard } from '../arx.guard';
import type { ArxService } from '../arx.service';
import type { ArxModuleOptions } from '../interfaces';
import { ARX_PERMISSIONS_KEY, ARX_ROLES_KEY } from '../tokens';

function createContext(request: Record<string, unknown> = {}): ExecutionContext {
  return {
    getHandler: () => ({}) as never,
    getClass: () => ({}) as never,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createReflector(metadata: { permissions?: string[]; roles?: string[] }): Reflector {
  return {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === ARX_PERMISSIONS_KEY) return metadata.permissions;
      if (key === ARX_ROLES_KEY) return metadata.roles;
      return undefined;
    }),
  } as unknown as Reflector;
}

function createArx(overrides: Partial<ArxService> = {}): ArxService {
  return {
    canAll: vi.fn().mockResolvedValue(true),
    hasRole: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as ArxService;
}

describe('ArxGuard', () => {
  let onUnauthorized: ReturnType<typeof vi.fn>;
  let onForbidden: ReturnType<typeof vi.fn>;
  let options: ArxModuleOptions;

  beforeEach(() => {
    onUnauthorized = vi.fn();
    onForbidden = vi.fn();
    options = {
      adapter: {} as ArxModuleOptions['adapter'],
      getUserId: (req) => req.userId as string | undefined,
      // Guard only calls these for their side effect and never uses the
      // return value, so a mock standing in for a "throws" callback is safe
      // here despite not truly returning `never`.
      onUnauthorized: onUnauthorized as unknown as (ctx: ExecutionContext) => never,
      onForbidden: onForbidden as unknown as (ctx: ExecutionContext) => never,
    };
  });

  it('allows the request through when no arx decorators are present', async () => {
    const arx = createArx();
    const reflector = createReflector({});
    const guard = new ArxGuard(arx, reflector, options);

    const allowed = await guard.canActivate(createContext());

    expect(allowed).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('denies and calls onUnauthorized when no userId can be resolved', async () => {
    const arx = createArx();
    const reflector = createReflector({ permissions: ['post:edit'] });
    const guard = new ArxGuard(arx, reflector, options);

    const allowed = await guard.canActivate(createContext({}));

    expect(allowed).toBe(false);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('denies and calls onForbidden when the user lacks a required permission', async () => {
    const arx = createArx({ canAll: vi.fn().mockResolvedValue(false) });
    const reflector = createReflector({ permissions: ['post:edit'] });
    const guard = new ArxGuard(arx, reflector, options);

    const allowed = await guard.canActivate(createContext({ userId: 'user-1' }));

    expect(allowed).toBe(false);
    expect(arx.canAll).toHaveBeenCalledWith('user-1', ['post:edit']);
    expect(onForbidden).toHaveBeenCalledOnce();
  });

  it('denies and calls onForbidden when the user holds none of the required roles', async () => {
    const arx = createArx({ hasRole: vi.fn().mockResolvedValue(false) });
    const reflector = createReflector({ roles: ['admin', 'moderator'] });
    const guard = new ArxGuard(arx, reflector, options);

    const allowed = await guard.canActivate(createContext({ userId: 'user-1' }));

    expect(allowed).toBe(false);
    expect(onForbidden).toHaveBeenCalledOnce();
  });

  it('allows the request when the user satisfies both permissions and roles', async () => {
    const arx = createArx();
    const reflector = createReflector({ permissions: ['post:edit'], roles: ['editor'] });
    const guard = new ArxGuard(arx, reflector, options);

    const allowed = await guard.canActivate(createContext({ userId: 'user-1' }));

    expect(allowed).toBe(true);
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('returns false without throwing when no hooks are configured', async () => {
    const arx = createArx({ canAll: vi.fn().mockResolvedValue(false) });
    const reflector = createReflector({ permissions: ['post:edit'] });
    const bareOptions: ArxModuleOptions = {
      adapter: {} as ArxModuleOptions['adapter'],
      getUserId: (req) => req.userId as string | undefined,
    };
    const guard = new ArxGuard(arx, reflector, bareOptions);

    await expect(guard.canActivate(createContext({ userId: 'user-1' }))).resolves.toBe(false);
  });
});
