import { type DynamicModule, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ArxService } from './arx.service.js';
import { ArxGuard } from './arx.guard.js';
import type { ArxModuleAsyncOptions, ArxModuleOptions } from './interfaces.js';
import { ARX_MODULE_OPTIONS } from './tokens.js';

/**
 * NestJS module for @arx/core.
 *
 * Provides ArxService and ArxGuard across your application.
 * By default the module is global — import it once in AppModule.
 *
 * @example — static configuration
 * ArxModule.forRoot({
 *   adapter: new PrismaAdapter(prisma),
 *   getUserId: (req) => req.user?.id,
 * })
 *
 * @example — async configuration (e.g. depends on ConfigService)
 * ArxModule.forRootAsync({
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     adapter: new PrismaAdapter(prisma),
 *     getUserId: (req) => req.user?.id,
 *   }),
 * })
 */
@Module({})
export class ArxModule {
  static forRoot(options: ArxModuleOptions): DynamicModule {
    return {
      module: ArxModule,
      global: options.isGlobal ?? true,
      providers: [
        {
          provide: ARX_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: ArxService,
          useFactory: (opts: ArxModuleOptions) => new ArxService(opts),
          inject: [ARX_MODULE_OPTIONS],
        },
        {
          provide: ArxGuard,
          useFactory: (
            service: ArxService,
            reflector: Reflector,
            opts: ArxModuleOptions,
          ) => new ArxGuard(service, reflector, opts),
          inject: [ArxService, Reflector, ARX_MODULE_OPTIONS],
        },
      ],
      exports: [ArxService, ArxGuard],
    };
  }

  static forRootAsync(options: ArxModuleAsyncOptions): DynamicModule {
    return {
      module: ArxModule,
      global: options.isGlobal ?? true,
      providers: [
        {
          provide: ARX_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: (options.inject ?? []) as never[],
        },
        {
          provide: ArxService,
          useFactory: (opts: ArxModuleOptions) => new ArxService(opts),
          inject: [ARX_MODULE_OPTIONS],
        },
        {
          provide: ArxGuard,
          useFactory: (
            service: ArxService,
            reflector: Reflector,
            opts: ArxModuleOptions,
          ) => new ArxGuard(service, reflector, opts),
          inject: [ArxService, Reflector, ARX_MODULE_OPTIONS],
        },
      ],
      exports: [ArxService, ArxGuard],
    };
  }
}
