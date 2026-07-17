import 'reflect-metadata';
import { InMemoryAdapter } from '@arxjs/core';
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
