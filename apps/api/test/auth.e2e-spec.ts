import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { AuthResponse } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());
  const newEmail = () => `${randomUUID()}@test.7trip.co`;
  // Generated at run time: no credential-looking literals in the repository.
  const newPassword = () => `pw-${randomUUID()}`;

  async function register(email = newEmail(), password = newPassword()): Promise<AuthResponse> {
    const res = await api().post('/v1/auth/register').send({ email, password, displayName: 'Jordan' }).expect(201);
    return res.body as AuthResponse;
  }

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registration', () => {
    it('creates an unverified account, signs it in and sends a verification code', async () => {
      const email = newEmail();
      await api().post('/v1/auth/email-status').send({ email }).expect(200, { exists: false });

      const session = await register(email.toUpperCase());

      expect(session.user).toMatchObject({ email, displayName: 'Jordan', emailVerified: false });
      expect(session.accessToken).toBeTruthy();
      expect(session.refreshToken).toBeTruthy();
      expect(session.devEmailCode).toMatch(/^\d{6}$/);
      await api().post('/v1/auth/email-status').send({ email }).expect(200, { exists: true });
    });

    it('refuses a second account for the same email, whatever the case', async () => {
      const email = newEmail();
      await register(email);
      const res = await api()
        .post('/v1/auth/register')
        .send({ email: ` ${email.toUpperCase()} `, password: newPassword(), displayName: 'Copie' })
        .expect(409);
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('explains validation errors field by field', async () => {
      const res = await api()
        .post('/v1/auth/register')
        .send({ email: 'pas-un-email', password: 'x'.repeat(5), displayName: '' })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.fields).toMatchObject({
        email: 'Adresse email invalide',
        password: 'Au moins 8 caractères',
        displayName: 'Indique ton prénom ou un pseudo',
      });
    });
  });

  describe('email verification', () => {
    it('verifies the email with the right code only', async () => {
      const session = await register();
      const auth = { Authorization: `Bearer ${session.accessToken}` };

      const wrong = session.devEmailCode === '000000' ? '000001' : '000000';
      const res = await api().post('/v1/auth/verify-email').set(auth).send({ code: wrong }).expect(400);
      expect(res.body.code).toBe('INVALID_CODE');

      const ok = await api().post('/v1/auth/verify-email').set(auth).send({ code: session.devEmailCode }).expect(200);
      expect(ok.body.emailVerified).toBe(true);
    });

    it('only accepts the latest code, and locks it after five wrong guesses', async () => {
      const session = await register();
      const auth = { Authorization: `Bearer ${session.accessToken}` };

      const resent = await api().post('/v1/auth/verify-email/resend').set(auth).expect(200);
      expect(resent.body.devEmailCode).toMatch(/^\d{6}$/);
      if (session.devEmailCode !== resent.body.devEmailCode) {
        await api().post('/v1/auth/verify-email').set(auth).send({ code: session.devEmailCode }).expect(400);
      }

      const wrong = resent.body.devEmailCode === '999999' ? '999998' : '999999';
      for (let i = 0; i < 5; i++) {
        await api().post('/v1/auth/verify-email').set(auth).send({ code: wrong });
      }
      await api().post('/v1/auth/verify-email').set(auth).send({ code: resent.body.devEmailCode }).expect(400);
    });

    it('requires a signed-in user', async () => {
      const res = await api().post('/v1/auth/verify-email').send({ code: '123456' }).expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('login and sessions', () => {
    it('logs in with the right password and gives the same error for any failure', async () => {
      const email = newEmail();
      const password = newPassword();
      await register(email, password);

      const ok = await api().post('/v1/auth/login').send({ email, password }).expect(200);
      expect(ok.body.user.email).toBe(email);

      const wrongPassword = await api().post('/v1/auth/login').send({ email, password: newPassword() }).expect(401);
      const unknownUser = await api().post('/v1/auth/login').send({ email: newEmail(), password: newPassword() }).expect(401);
      expect(wrongPassword.body).toEqual(unknownUser.body);
      expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rotates refresh tokens and revokes every session when an old one is replayed', async () => {
      const first = await register();

      const second = await api().post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(200);
      expect(second.body.refreshToken).not.toBe(first.refreshToken);
      expect(second.body.user.id).toBe(first.user.id);

      // Replaying the first token looks like theft: everything is revoked.
      await api().post('/v1/auth/refresh').send({ refreshToken: first.refreshToken }).expect(401);
      const after = await api().post('/v1/auth/refresh').send({ refreshToken: second.body.refreshToken }).expect(401);
      expect(after.body.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('logs out by revoking the refresh token', async () => {
      const session = await register();
      await api().post('/v1/auth/logout').send({ refreshToken: session.refreshToken }).expect(204);
      await api().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    });
  });

  describe('forgotten password', () => {
    it('answers the same way for unknown emails', async () => {
      const res = await api().post('/v1/auth/forgot-password').send({ email: newEmail() }).expect(200);
      expect(res.body).toEqual({});
    });

    it('resets the password with the emailed code and signs out other sessions', async () => {
      const email = newEmail();
      const oldPassword = newPassword();
      const newPasswordValue = newPassword();
      const original = await register(email, oldPassword);

      const sent = await api().post('/v1/auth/forgot-password').send({ email }).expect(200);
      expect(sent.body.devEmailCode).toMatch(/^\d{6}$/);

      const wrong = sent.body.devEmailCode === '111111' ? '111112' : '111111';
      await api()
        .post('/v1/auth/reset-password')
        .send({ email, code: wrong, password: newPasswordValue })
        .expect(400);

      const reset = await api()
        .post('/v1/auth/reset-password')
        .send({ email, code: sent.body.devEmailCode, password: newPasswordValue })
        .expect(200);
      expect(reset.body.user.emailVerified).toBe(true);

      await api().post('/v1/auth/refresh').send({ refreshToken: original.refreshToken }).expect(401);
      await api().post('/v1/auth/login').send({ email, password: oldPassword }).expect(401);
      await api().post('/v1/auth/login').send({ email, password: newPasswordValue }).expect(200);
    });
  });

  describe('profile', () => {
    it('returns and updates the signed-in user', async () => {
      const session = await register();
      const auth = { Authorization: `Bearer ${session.accessToken}` };

      await api().get('/v1/me').expect(401);
      const me = await api().get('/v1/me').set(auth).expect(200);
      expect(me.body.id).toBe(session.user.id);

      const updated = await api().patch('/v1/me').set(auth).send({ displayName: '  Jo  ' }).expect(200);
      expect(updated.body.displayName).toBe('Jo');
    });
  });
});
