import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Settings shared by the real server and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1');
  app.enableCors();
  // Requests arrive through a local reverse proxy / tunnel: trust its X-Forwarded-For so rate
  // limiting sees the real client IP.
  (app as NestExpressApplication).set('trust proxy', 'loopback');
}
