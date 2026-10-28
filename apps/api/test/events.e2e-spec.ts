import type { INestApplication } from '@nestjs/common';
import { GUEST_TOKEN_HEADER, type GuestJoinResponse, type Idea, type TripDetail, type TripEvent, type TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Planning (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  let thomas: TestUser;
  const api = () => request(app.getHttpServer());
  const asGuest = (token: string) => ({ [GUEST_TOKEN_HEADER]: token });

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
    thomas = await createVerifiedUser(app, 'Thomas');
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by Jordan, joined by Léa and Thomas. */
  async function newTrip() {
    const created = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie' }).expect(201)).body as TripDetail;
    const code = ((await api().get(`/v1/trips/${created.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation).code;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    await api().post(`/v1/invitations/${code}/join`).set(thomas.auth).expect(201);
    const trip = (await api().get(`/v1/trips/${created.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    const id = (name: string) => trip.participants.find((p) => p.displayName === name)!.id;
    return { trip, code, ids: { jordan: id('Jordan'), lea: id('Léa'), thomas: id('Thomas') } };
  }

  async function add(tripId: string, headers: Record<string, string>, body: Record<string, unknown>) {
    return (await api().post(`/v1/trips/${tripId}/events`).set(headers).send(body).expect(201)).body as TripEvent;
  }

  const planningOf = async (tripId: string, headers: Record<string, string>) =>
    (await api().get(`/v1/trips/${tripId}/events`).set(headers).expect(200)).body as TripEvent[];

  it('takes a date alone, a range of days or times, and lists them in timeline order (CDC §7)', async () => {
    const { trip, ids } = await newTrip();
    await add(trip.id, lea.auth, { title: 'Flamenco', startDate: '2026-10-20', startTime: '19:00', endTime: '21:00', participantIds: [ids.lea] });
    await add(trip.id, jordan.auth, { title: 'Hôtel Casa Triana', category: 'LODGING', startDate: '2026-10-19', endDate: '2026-10-22' });
    await add(trip.id, thomas.auth, { title: 'Marché de Triana', category: 'FOOD', startDate: '2026-10-20' });
    // Two events at the same time are accepted: overlaps are flagged by the apps, never refused.
    await add(trip.id, thomas.auth, { title: 'Tapas', category: 'FOOD', startDate: '2026-10-20', startTime: '18:00', endTime: '19:30', participantIds: [ids.lea, ids.thomas] });
    const single = await add(trip.id, jordan.auth, { title: 'Train', category: 'TRANSPORT', startDate: '2026-10-21', endDate: '2026-10-21', startTime: '08:00' });
    expect(single).toMatchObject({ endDate: null, endTime: null, bookingRef: null, author: { displayName: 'Jordan' }, idea: null, version: 1 });

    const planning = await planningOf(trip.id, lea.auth);
    expect(planning.map((e) => e.title)).toEqual(['Hôtel Casa Triana', 'Marché de Triana', 'Tapas', 'Flamenco', 'Train']);
    expect(planning[0]).toMatchObject({ startDate: '2026-10-19', endDate: '2026-10-22', startTime: null, participantIds: [] });

    await api()
      .post(`/v1/trips/${trip.id}/events`)
      .set(lea.auth)
      .send({ title: 'Impossible', startDate: '2026-10-20', startTime: '18:00', endTime: '17:00' })
      .expect(400);
  });

  it('keeps events within the trip dates, once they are set', async () => {
    const { trip } = await newTrip();
    await api().patch(`/v1/trips/${trip.id}`).set(jordan.auth).send({ startDate: '2026-10-17', endDate: '2026-10-24' }).expect(200);
    const post = (body: Record<string, unknown>) => api().post(`/v1/trips/${trip.id}/events`).set(lea.auth).send({ title: 'Tapas', ...body });

    const before = await post({ startDate: '2026-10-16' }).expect(400);
    expect(before.body).toMatchObject({ code: 'VALIDATION_FAILED', fields: { startDate: 'Le voyage commence le 17 oct.' } });
    await post({ startDate: '2026-10-23', endDate: '2026-10-25' }).expect(400);
    const inside = (await post({ startDate: '2026-10-24' }).expect(201)).body as TripEvent;
    await api().patch(`/v1/trips/${trip.id}/events/${inside.id}`).set(lea.auth).send({ startDate: '2026-10-25' }).expect(400);

    // The trip gets shorter: the event left outside stays, and can still be edited without moving it.
    await api().patch(`/v1/trips/${trip.id}`).set(jordan.auth).send({ endDate: '2026-10-20' }).expect(200);
    await api().patch(`/v1/trips/${trip.id}/events/${inside.id}`).set(lea.auth).send({ title: 'Tapas tardives' }).expect(200);
  });

  it('lets the author, the people on it and the organizers edit, and nobody else', async () => {
    const { trip, ids } = await newTrip();
    const tapas = await add(trip.id, lea.auth, { title: 'Tapas', startDate: '2026-10-20', participantIds: [ids.lea] });
    const group = await add(trip.id, lea.auth, { title: 'Pique-nique', startDate: '2026-10-21' });

    const asThomas = (await api().get(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).expect(200)).body as TripEvent;
    expect(asThomas.canEdit).toBe(false);
    await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).send({ title: 'Volé' }).expect(403);
    await api().delete(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).expect(403);
    // A whole-group event: everyone is on it.
    await api().patch(`/v1/trips/${trip.id}/events/${group.id}`).set(thomas.auth).send({ place: 'Parc María Luisa' }).expect(200);

    // Once Thomas is on it, he can edit it too.
    await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(jordan.auth).send({ participantIds: [ids.lea, ids.thomas] }).expect(200);
    const edited = (await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).send({ startTime: '20:00' }).expect(200))
      .body as TripEvent;
    expect(edited).toMatchObject({ startTime: '20:00', participantIds: expect.arrayContaining([ids.lea, ids.thomas]), version: 3 });

    // The schedule is checked once merged with what is stored.
    await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).send({ endTime: '19:00' }).expect(400);
    await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).send({ version: 1, title: 'Ancien' }).expect(409);
  });

  it('only takes people of the trip', async () => {
    const { trip } = await newTrip();
    const other = await newTrip();
    await api()
      .post(`/v1/trips/${trip.id}/events`)
      .set(lea.auth)
      .send({ title: 'Tapas', startDate: '2026-10-20', participantIds: [other.ids.lea] })
      .expect(400);
  });

  it('plans an idea, removes it from the planning and plans it again, without losing it (CDC criterion)', async () => {
    const { trip } = await newTrip();
    const idea = (await api()
      .post(`/v1/trips/${trip.id}/ideas`)
      .set(lea.auth)
      .send({ title: 'Plaza de España', place: 'Séville', cost: 'Gratuit', status: 'PROPOSED' })
      .expect(201)).body as Idea;
    const ideaOf = async () => (await api().get(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(lea.auth).expect(200)).body as Idea;

    const planned = await add(trip.id, jordan.auth, { title: idea.title, place: idea.place, ideaId: idea.id, startDate: '2026-10-20', startTime: '18:00' });
    expect(planned.idea).toMatchObject({ id: idea.id, author: { displayName: 'Léa' } });
    expect((await ideaOf()).plannedEvent).toEqual({ id: planned.id, startDate: '2026-10-20', startTime: '18:00' });
    await api().post(`/v1/trips/${trip.id}/events`).set(lea.auth).send({ title: 'Encore', ideaId: idea.id, startDate: '2026-10-21' }).expect(409);

    await api().delete(`/v1/trips/${trip.id}/events/${planned.id}`).set(jordan.auth).expect(204);
    expect(await ideaOf()).toMatchObject({ title: 'Plaza de España', place: 'Séville', cost: 'Gratuit', author: { displayName: 'Léa' }, plannedEvent: null });

    const again = await add(trip.id, lea.auth, { title: idea.title, ideaId: idea.id, startDate: '2026-10-22' });
    expect((await ideaOf()).plannedEvent).toMatchObject({ id: again.id, startDate: '2026-10-22' });

    // Deleting the idea keeps the event, unlinked.
    await api().delete(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(lea.auth).expect(204);
    const kept = (await api().get(`/v1/trips/${trip.id}/events/${again.id}`).set(lea.auth).expect(200)).body as TripEvent;
    expect(kept).toMatchObject({ title: 'Plaza de España', idea: null });
  });

  it('keeps events inside their trip', async () => {
    const { trip } = await newTrip();
    const other = (await api().post('/v1/trips').set(lea.auth).send({ title: 'Ailleurs' }).expect(201)).body as TripDetail;
    const event = await add(trip.id, jordan.auth, { title: 'Alhambra', startDate: '2026-10-20' });
    const outsider = await createVerifiedUser(app, 'Intrus');

    await api().get(`/v1/trips/${trip.id}/events`).set(outsider.auth).expect(404);
    await api().get(`/v1/trips/${other.id}/events/${event.id}`).set(lea.auth).expect(404);
    await api().patch(`/v1/trips/${other.id}/events/${event.id}`).set(lea.auth).send({ title: 'Volé' }).expect(404);
    await api().get(`/v1/trips/${trip.id}/events/not-a-uuid`).set(jordan.auth).expect(404);
    // Another trip's idea cannot be planned here.
    const foreign = (await api().post(`/v1/trips/${other.id}/ideas`).set(lea.auth).send({ title: 'Ailleurs' }).expect(201)).body as Idea;
    await api().post(`/v1/trips/${trip.id}/events`).set(lea.auth).send({ title: 'x', ideaId: foreign.id, startDate: '2026-10-20' }).expect(404);
  });

  it('keeps someone who left on their events, and they can stay there on edit', async () => {
    const { trip, ids } = await newTrip();
    const tapas = await add(trip.id, lea.auth, { title: 'Tapas', startDate: '2026-10-20', participantIds: [ids.lea, ids.thomas] });
    await api().post(`/v1/trips/${trip.id}/leave`).set(lea.auth).expect(204);

    const kept = (await api().get(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).expect(200)).body as TripEvent;
    expect(kept).toMatchObject({ author: { displayName: 'Léa', hasLeft: true }, participantIds: expect.arrayContaining([ids.lea]) });
    await api().patch(`/v1/trips/${trip.id}/events/${tapas.id}`).set(thomas.auth).send({ participantIds: [ids.lea, ids.thomas] }).expect(200);
    // But nobody who left can be added again.
    const pique = await add(trip.id, thomas.auth, { title: 'Pique-nique', startDate: '2026-10-21', participantIds: [ids.thomas] });
    await api().patch(`/v1/trips/${trip.id}/events/${pique.id}`).set(thomas.auth).send({ participantIds: [ids.thomas, ids.lea] }).expect(400);
  });

  it('moves a guest’s events to the account they sign in to', async () => {
    const { trip, code, ids } = await newTrip();
    const joined = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Léa invitée' }).expect(201))
      .body as GuestJoinResponse;
    const { token } = joined;
    const participantId = joined.trip.participants.find((p) => p.isMe)!.id;

    const mine = await add(trip.id, asGuest(token), { title: 'Coucher de soleil', startDate: '2026-10-20', participantIds: [participantId] });
    const both = await add(trip.id, jordan.auth, { title: 'Tapas', startDate: '2026-10-20', participantIds: [participantId, ids.lea] });

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);
    const planning = await planningOf(trip.id, lea.auth);
    expect(planning.find((e) => e.id === mine.id)).toMatchObject({ author: { displayName: 'Léa' }, participantIds: [ids.lea], canEdit: true });
    expect(planning.find((e) => e.id === both.id)?.participantIds).toEqual([ids.lea]);
  });

  it('deletes the planning with its trip', async () => {
    const { trip } = await newTrip();
    await add(trip.id, jordan.auth, { title: 'Alhambra', startDate: '2026-10-20' });
    await api().delete(`/v1/trips/${trip.id}`).set(jordan.auth).expect(204);
    await api().get(`/v1/trips/${trip.id}/events`).set(jordan.auth).expect(404);
  });
});
