import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health reports the database as up', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'up' });
  });
});
