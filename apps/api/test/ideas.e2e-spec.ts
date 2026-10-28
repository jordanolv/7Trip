import type { INestApplication } from '@nestjs/common';
import { GUEST_TOKEN_HEADER, type GuestJoinResponse, type Idea, type TripDetail, type TripInvitation, type UnseenIdeas } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Ideas (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  const api = () => request(app.getHttpServer());
  const asGuest = (token: string) => ({ [GUEST_TOKEN_HEADER]: token });

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by Jordan, joined by Léa. */
  async function newTrip() {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie' }).expect(201)).body as TripDetail;
    const code = ((await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation).code;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    return { trip, code };
  }

  async function propose(tripId: string, headers: Record<string, string>, body: Record<string, unknown>) {
    return (await api().post(`/v1/trips/${tripId}/ideas`).set(headers).send(body).expect(201)).body as Idea;
  }

  const ideasOf = async (tripId: string, headers: Record<string, string>) =>
    (await api().get(`/v1/trips/${tripId}/ideas`).set(headers).expect(200)).body as Idea[];

  it('lets anyone in the trip propose an idea with only a title, newest first (CDC §5)', async () => {
    const { trip } = await newTrip();
    const first = await propose(trip.id, lea.auth, { title: 'Plage de Bolonia' });
    expect(first).toMatchObject({
      title: 'Plage de Bolonia',
      category: null,
      place: null,
      status: 'PROPOSED',
      author: { displayName: 'Léa', hasLeft: false },
      version: 1,
      canEdit: true,
    });

    await propose(trip.id, jordan.auth, {
      title: 'Visite de l’Alcázar',
      category: 'CULTURE',
      place: 'Real Alcázar, Séville',
      url: 'www.alcazarsevilla.org',
      cost: '13,50 € / pers.',
      description: '',
    });

    const list = await ideasOf(trip.id, lea.auth);
    expect(list.map((idea) => [idea.title, idea.author.displayName, idea.canEdit])).toEqual([
      ['Visite de l’Alcázar', 'Jordan', false],
      ['Plage de Bolonia', 'Léa', true],
    ]);
    expect(list[0]).toMatchObject({ url: 'https://www.alcazarsevilla.org', description: null });

    await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: '  ' }).expect(400);
  });

  it('lets the author and the organizers edit, and nobody else', async () => {
    const { trip } = await newTrip();
    const ofJordan = await propose(trip.id, jordan.auth, { title: 'Bar El Rinconcillo' });
    const ofLea = await propose(trip.id, lea.auth, { title: 'Kayak à Cadix' });

    await api().patch(`/v1/trips/${trip.id}/ideas/${ofJordan.id}`).set(lea.auth).send({ title: 'Autre bar' }).expect(403);
    await api().delete(`/v1/trips/${trip.id}/ideas/${ofJordan.id}`).set(lea.auth).expect(403);

    const byAuthor = await api().patch(`/v1/trips/${trip.id}/ideas/${ofLea.id}`).set(lea.auth).send({ category: 'ACTIVITY', cost: '~25 €' }).expect(200);
    expect(byAuthor.body as Idea).toMatchObject({ title: 'Kayak à Cadix', category: 'ACTIVITY', cost: '~25 €', version: 2 });

    // Organizers keep the box tidy: they can retain or remove anyone's idea.
    const kept = await api().patch(`/v1/trips/${trip.id}/ideas/${ofLea.id}`).set(jordan.auth).send({ status: 'KEPT' }).expect(200);
    expect((kept.body as Idea).status).toBe('KEPT');
    await api().delete(`/v1/trips/${trip.id}/ideas/${ofLea.id}`).set(jordan.auth).expect(204);
    await api().get(`/v1/trips/${trip.id}/ideas/${ofLea.id}`).set(jordan.auth).expect(404);
  });

  it('refuses a change made on an outdated version (409)', async () => {
    const { trip } = await newTrip();
    const idea = await propose(trip.id, lea.auth, { title: 'Flamenco' });

    await api().patch(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(jordan.auth).send({ place: 'Triana', version: 1 }).expect(200);
    const stale = await api().patch(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(lea.auth).send({ place: 'Centre', version: 1 }).expect(409);
    expect(stale.body).toMatchObject({ code: 'EDIT_CONFLICT' });

    const current = (await api().get(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(lea.auth).expect(200)).body as Idea;
    expect(current).toMatchObject({ place: 'Triana', version: 2 });
  });

  it('keeps ideas inside their trip', async () => {
    const { trip } = await newTrip();
    const other = (await api().post('/v1/trips').set(lea.auth).send({ title: 'Ailleurs' }).expect(201)).body as TripDetail;
    const idea = await propose(trip.id, jordan.auth, { title: 'Cathédrale' });
    const thomas = await createVerifiedUser(app, 'Thomas');

    await api().get(`/v1/trips/${trip.id}/ideas`).set(thomas.auth).expect(404);
    await api().post(`/v1/trips/${trip.id}/ideas`).set(thomas.auth).send({ title: 'Intrus' }).expect(404);
    // The right idea id under another trip of the caller is unknown there.
    await api().get(`/v1/trips/${other.id}/ideas/${idea.id}`).set(lea.auth).expect(404);
    await api().patch(`/v1/trips/${other.id}/ideas/${idea.id}`).set(lea.auth).send({ title: 'Volé' }).expect(404);
    await api().get(`/v1/trips/${trip.id}/ideas/not-a-uuid`).set(jordan.auth).expect(404);
  });

  it('keeps the ideas of someone who left, shown as gone', async () => {
    const { trip } = await newTrip();
    await propose(trip.id, lea.auth, { title: 'Tapas' });
    await api().post(`/v1/trips/${trip.id}/leave`).set(lea.auth).expect(204);

    const [idea] = await ideasOf(trip.id, jordan.auth);
    expect(idea).toMatchObject({ title: 'Tapas', author: { displayName: 'Léa', hasLeft: true }, canEdit: true });
  });

  it('lets a guest propose, and keeps their ideas when they sign in to an account already in the trip', async () => {
    const { trip, code } = await newTrip();
    const { token } = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Léa invitée' }).expect(201))
      .body as GuestJoinResponse;

    const idea = await propose(trip.id, asGuest(token), { title: 'Coucher de soleil', category: 'WALK' });
    expect(idea).toMatchObject({ author: { displayName: 'Léa invitée' }, canEdit: true });

    // Léa's account is already a participant: the guest participation is merged into it.
    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);
    const [kept] = await ideasOf(trip.id, lea.auth);
    expect(kept).toMatchObject({ id: idea.id, author: { displayName: 'Léa', hasLeft: false }, canEdit: true });
  });

  it('counts the ideas proposed by others since the idea box was last opened', async () => {
    const { trip } = await newTrip();
    const unseen = async (headers: Record<string, string>) =>
      ((await api().get(`/v1/trips/${trip.id}/ideas/unseen`).set(headers).expect(200)).body as UnseenIdeas).count;
    const markSeen = (headers: Record<string, string>, until: string) =>
      api().post(`/v1/trips/${trip.id}/ideas/seen`).set(headers).send({ until }).expect(204);

    const first = await propose(trip.id, lea.auth, { title: 'Plage de Bolonia' });
    await propose(trip.id, jordan.auth, { title: 'Tapas à Triana' });
    expect(await unseen(jordan.auth)).toBe(1); // His own idea is not news to him.
    expect(await unseen(lea.auth)).toBe(1);

    await markSeen(jordan.auth, first.createdAt);
    expect(await unseen(jordan.auth)).toBe(0);
    // An idea proposed after the list was shown stays new, and an older `until` changes nothing.
    await propose(trip.id, lea.auth, { title: 'Flamenco' });
    await markSeen(jordan.auth, '2020-01-01T00:00:00Z');
    expect(await unseen(jordan.auth)).toBe(1);

    await api().post(`/v1/trips/${trip.id}/ideas/seen`).set(jordan.auth).send({ until: 'hier' }).expect(400);
  });

  it('deletes the ideas with their trip', async () => {
    const { trip } = await newTrip();
    await propose(trip.id, jordan.auth, { title: 'Alhambra' });
    await api().delete(`/v1/trips/${trip.id}`).set(jordan.auth).expect(204);
    await api().get(`/v1/trips/${trip.id}/ideas`).set(jordan.auth).expect(404);
  });
});
