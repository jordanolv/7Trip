import type { INestApplication } from '@nestjs/common';

/** Settings shared by the real server and the e2e tests. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('v1');
  app.enableCors();
}
