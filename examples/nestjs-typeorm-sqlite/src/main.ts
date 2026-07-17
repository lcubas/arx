import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Seed roles, permissions, and test users on startup
  const seed = app.get(SeedService);
  await seed.run();

  await app.listen(3000, () => {
    console.log('\n🚀 ARX + NestJS + TypeORM example running at http://localhost:3000/api');
  });
}

bootstrap();
