import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function controllerWith(queryRaw: () => Promise<unknown>): HealthController {
  return new HealthController({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const controller = controllerWith(() => Promise.resolve([{ '?column?': 1 }]));
    await expect(controller.check()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    const controller = controllerWith(() => Promise.reject(new Error('ECONNREFUSED')));
    await expect(controller.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
