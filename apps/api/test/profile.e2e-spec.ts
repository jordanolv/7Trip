import type { INestApplication } from '@nestjs/common';
import { defaultAvatarColor, type Idea, type Me, type TripDetail, type TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Profile (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
  });

  afterAll(async () => {
    await app.close();
  });

  it('gives a default avatar colour, then the chosen one', async () => {
    const me = (await api().get('/v1/me').set(lea.auth).expect(200)).body as Me;
    expect(me.avatarColor).toBe(defaultAvatarColor(me.id));

    await api().patch('/v1/me').set(lea.auth).send({}).expect(400);
    await api().patch('/v1/me').set(lea.auth).send({ avatarColor: 'gold' }).expect(400);
    const updated = (await api().patch('/v1/me').set(lea.auth).send({ avatarColor: 'rose' }).expect(200)).body as Me;
    expect(updated).toMatchObject({ avatarColor: 'rose', displayName: 'Léa' });
  });

  it('carries the name and colour into every trip, including past content', async () => {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Lisbonne' }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    const idea = (await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: 'Pastéis de Belém' }).expect(201)).body as Idea;
    expect(idea.author.avatarColor).toBe('rose');

    await api().patch('/v1/me').set(lea.auth).send({ displayName: 'Léa M.', avatarColor: 'sky' }).expect(200);
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    expect(detail.participants.find((p) => p.displayName === 'Léa M.')?.avatarColor).toBe('sky');
    const ideas = (await api().get(`/v1/trips/${trip.id}/ideas`).set(jordan.auth).expect(200)).body as Idea[];
    expect(ideas.find((i) => i.id === idea.id)?.author).toMatchObject({ displayName: 'Léa M.', avatarColor: 'sky' });

    // A guest has no account: their colour comes from their participant id.
    await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Inès' }).expect(201);
    const withGuest = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    const ines = withGuest.participants.find((p) => p.displayName === 'Inès')!;
    expect(ines.avatarColor).toBe(defaultAvatarColor(ines.id));
  });
});
