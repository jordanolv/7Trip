import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { AuthResponse } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';

export const newEmail = () => `${randomUUID()}@test.7trip.co`;
// Generated at run time: no credential-looking literals in the repository.
export const newPassword = () => `pw-${randomUUID()}`;

export interface TestUser {
  session: AuthResponse;
  auth: { Authorization: string };
}

/** Registers a user and confirms their email with the code echoed in test mode. */
export async function createVerifiedUser(app: INestApplication<App>, displayName = 'Jordan'): Promise<TestUser> {
  const res = await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email: newEmail(), password: newPassword(), displayName })
    .expect(201);
  const session = res.body as AuthResponse;
  const auth = { Authorization: `Bearer ${session.accessToken}` };
  await request(app.getHttpServer())
    .post('/v1/auth/verify-email')
    .set(auth)
    .send({ code: session.devEmailCode })
    .expect(200);
  return { session, auth };
}
