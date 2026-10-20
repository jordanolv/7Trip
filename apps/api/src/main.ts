import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { loadEnv } from './config/env.js';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(env.PORT);
}
await bootstrap();
