import type { INestApplication } from '@nestjs/common';
import type { AuthResponse, TripDetail, TripSummary } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, newEmail, newPassword, type TestUser } from './helpers.js';

describe('Trips (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a trip with a title only and makes its creator organizer (CDC §15)', async () => {
    const res = await api().post('/v1/trips').set(jordan.auth).send({ title: 'Vacances d’été entre potes' }).expect(201);
    const trip = res.body as TripDetail;

    expect(trip).toMatchObject({
      title: 'Vacances d’été entre potes',
      destinations: [],
      startDate: null,
      endDate: null,
      kind: 'GROUP',
      icon: 'suitcase',
      participantCount: 1,
      myRole: 'ORGANIZER',
    });
    expect(trip.participants).toEqual([
      expect.objectContaining({ displayName: 'Jordan', role: 'ORGANIZER', isMe: true }),
    ]);
  });

  it('stores dates as calendar days and lists the user’s trips', async () => {
    const created = await api()
      .post('/v1/trips')
      .set(jordan.auth)
      .send({ title: 'Week-end Annecy', destinations: ['Annecy'], startDate: '2026-11-14', endDate: '2026-11-16', color: 'lagoon', icon: 'mountain' })
      .expect(201);
    expect(created.body).toMatchObject({ startDate: '2026-11-14', endDate: '2026-11-16', color: 'lagoon', icon: 'mountain' });

    const list = await api().get('/v1/me/trips').set(jordan.auth).expect(200);
    const titles = (list.body as TripSummary[]).map((t) => t.title);
    expect(titles).toContain('Week-end Annecy');
    expect(titles).toContain('Vacances d’été entre potes');
  });

  it('requires a verified email to create a trip', async () => {
    const res = await api()
      .post('/v1/auth/register')
      .send({ email: newEmail(), password: newPassword(), displayName: 'Pas vérifié' })
      .expect(201);
    const session = res.body as AuthResponse;
    const denied = await api()
      .post('/v1/trips')
      .set({ Authorization: `Bearer ${session.accessToken}` })
      .send({ title: 'Test' })
      .expect(403);
    expect(denied.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('validates the date range', async () => {
    const res = await api()
      .post('/v1/trips')
      .set(jordan.auth)
      .send({ title: 'À l’envers', startDate: '2026-11-16', endDate: '2026-11-14' })
      .expect(400);
    expect(res.body.fields.endDate).toBe('La date de fin doit être après la date de début');
  });

  it('keeps several destinations in order, and lets the organizer reorder or clear them', async () => {
    const created = await api()
      .post('/v1/trips')
      .set(jordan.auth)
      .send({ title: 'Pologne', destinations: ['Cracovie', 'Varsovie', 'Gdańsk'] })
      .expect(201);
    const id = (created.body as TripDetail).id;
    expect(created.body.destinations).toEqual(['Cracovie', 'Varsovie', 'Gdańsk']);

    const reordered = await api()
      .patch(`/v1/trips/${id}`)
      .set(jordan.auth)
      .send({ destinations: ['Gdańsk', 'Varsovie', 'Cracovie', 'Wrocław'] })
      .expect(200);
    expect(reordered.body.destinations).toEqual(['Gdańsk', 'Varsovie', 'Cracovie', 'Wrocław']);

    // Fields not sent are left untouched.
    const renamed = await api().patch(`/v1/trips/${id}`).set(jordan.auth).send({ title: 'Pologne 2026' }).expect(200);
    expect(renamed.body.destinations).toHaveLength(4);

    const cleared = await api().patch(`/v1/trips/${id}`).set(jordan.auth).send({ destinations: [] }).expect(200);
    expect(cleared.body.destinations).toEqual([]);

    const blank = await api().patch(`/v1/trips/${id}`).set(jordan.auth).send({ destinations: ['Cracovie', ' '] }).expect(400);
    expect(blank.body.code).toBe('VALIDATION_FAILED');
  });

  it('lets the organizer update the trip', async () => {
    const created = await api().post('/v1/trips').set(jordan.auth).send({ title: 'Road trip' }).expect(201);
    const id = (created.body as TripDetail).id;

    const updated = await api()
      .patch(`/v1/trips/${id}`)
      .set(jordan.auth)
      .send({ title: 'Road trip Andalousie', destinations: ['Séville'], startDate: '2026-10-17', endDate: '2026-10-24', color: 'orange', icon: 'sun' })
      .expect(200);
    expect(updated.body).toMatchObject({ title: 'Road trip Andalousie', destinations: ['Séville'], startDate: '2026-10-17', icon: 'sun' });

    // An end date before the stored start date is rejected too.
    await api().patch(`/v1/trips/${id}`).set(jordan.auth).send({ endDate: '2026-10-01' }).expect(400);
  });

  it('hides trips from non-members with a 404', async () => {
    const created = await api().post('/v1/trips').set(jordan.auth).send({ title: 'Privé' }).expect(201);
    const stranger = await createVerifiedUser(app, 'Inconnu');

    await api().get(`/v1/trips/${created.body.id}`).set(stranger.auth).expect(404);
    await api().patch(`/v1/trips/${created.body.id}`).set(stranger.auth).send({ title: 'Piraté' }).expect(404);
    await api().get('/v1/trips/pas-un-uuid').set(stranger.auth).expect(404);

    const strangerList = await api().get('/v1/me/trips').set(stranger.auth).expect(200);
    expect(strangerList.body).toEqual([]);
  });

  it('requires authentication', async () => {
    await api().get('/v1/me/trips').expect(401);
    await api().post('/v1/trips').send({ title: 'X' }).expect(401);
  });
});
