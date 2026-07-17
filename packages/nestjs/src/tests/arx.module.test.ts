import 'reflect-metadata';
import { InMemoryAdapter } from '@arxjs/core';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ArxGuard } from '../arx.guard';
import { ArxModule } from '../arx.module';
import { ArxService } from '../arx.service';

describe('ArxModule', () => {
  describe('forRoot', () => {
    it('registers ArxService and ArxGuard, resolvable from the container', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ArxModule.forRoot({
            adapter: new InMemoryAdapter(),
            getUserId: (req) => req.userId as string | undefined,
            isGlobal: false,
          }),
        ],
      }).compile();

      expect(moduleRef.get(ArxService)).toBeInstanceOf(ArxService);
      expect(moduleRef.get(ArxGuard)).toBeInstanceOf(ArxGuard);
    });

    it('defaults isGlobal to true', () => {
      const dynamicModule = ArxModule.forRoot({
        adapter: new InMemoryAdapter(),
        getUserId: () => undefined,
      });

      expect(dynamicModule.global).toBe(true);
    });

    it('respects isGlobal: false', () => {
      const dynamicModule = ArxModule.forRoot({
        adapter: new InMemoryAdapter(),
        getUserId: () => undefined,
        isGlobal: false,
      });

      expect(dynamicModule.global).toBe(false);
    });
  });

  describe('global guard registration', () => {
    it('compiles when registering APP_GUARD via useExisting: ArxGuard, as documented in the README', async () => {
      // ArxGuard is built by ArxModule's own factory (it depends on ArxModuleOptions,
      // which has no injection token, so Nest can't construct it via `useClass`).
      // `useExisting` reuses that already-built instance instead of asking Nest to
      // construct a new one — this must keep working, since the README documents it
      // as the way to register the guard globally.
      const moduleRef = await Test.createTestingModule({
        imports: [
          ArxModule.forRoot({
            adapter: new InMemoryAdapter(),
            getUserId: (req) => req.userId as string | undefined,
            isGlobal: false,
          }),
        ],
        providers: [{ provide: APP_GUARD, useExisting: ArxGuard }],
      }).compile();

      expect(moduleRef.get(ArxGuard)).toBeInstanceOf(ArxGuard);
    });
  });

  describe('forRootAsync', () => {
    it('registers ArxService and ArxGuard using the factory result', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ArxModule.forRootAsync({
            isGlobal: false,
            useFactory: () => ({
              adapter: new InMemoryAdapter(),
              getUserId: (req: Record<string, unknown>) => req.userId as string | undefined,
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(ArxService)).toBeInstanceOf(ArxService);
      expect(moduleRef.get(ArxGuard)).toBeInstanceOf(ArxGuard);
    });
  });
});
