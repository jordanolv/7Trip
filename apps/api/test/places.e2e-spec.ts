import type { INestApplication } from '@nestjs/common';
import type { Idea, PlaceDetails, PlaceSuggestion, TripDetail, TripEvent, TripInvitation } from '@7trip/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PlacesRefresher } from '../src/places/places.refresher.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

// PLACES_SOURCE=fixed: a few made-up places of Séville and Cadix (places.service.ts).
describe('Places (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  const api = () => request(app.getHttpServer());
  const session = randomUUID();

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
  });

  afterAll(async () => {
    await app.close();
  });

  async function newTrip(body: Record<string, unknown> = {}) {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie', ...body }).expect(201)).body as TripDetail;
    const code = ((await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation).code;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    return trip;
  }

  const search = async (tripId: string, q: string) =>
    (await api().get(`/v1/trips/${tripId}/places`).query({ q, session }).set(lea.auth).expect(200)).body as PlaceSuggestion[];

  it('suggests places while typing, to the trip’s members only', async () => {
    const trip = await newTrip();
    const found = await search(trip.id, 'plaza de espa');
    expect(found.map((place) => place.detail)).toEqual([
      'Av. de Isabel la Católica, 41004 Séville, Espagne',
      'Cadix, Espagne',
    ]);
    // No place picked yet in the trip: nothing to measure from.
    expect(found[0]).toMatchObject({ placeId: 'fixed-plaza-espana', name: 'Plaza de España', distanceMeters: null });

    const outsider = await createVerifiedUser(app, 'Thomas');
    await api().get(`/v1/trips/${trip.id}/places`).query({ q: 'plaza', session }).set(outsider.auth).expect(404);
    await api().get(`/v1/trips/${trip.id}/places`).query({ q: 'p', session }).set(lea.auth).expect(400);
    await api().get(`/v1/trips/${trip.id}/places`).query({ q: 'plaza', session: 'nope' }).set(lea.auth).expect(400);
  });

  it('looks a picked place up, and says when it does not exist', async () => {
    const trip = await newTrip();
    const details = (await api().get(`/v1/trips/${trip.id}/places/fixed-alcazar`).query({ session }).set(lea.auth).expect(200)).body as PlaceDetails;
    expect(details).toEqual({ placeId: 'fixed-alcazar', address: 'Patio de Banderas, 41004 Séville, Espagne', lat: 37.3831, lng: -5.9902 });
    await api().get(`/v1/trips/${trip.id}/places/nowhere`).set(lea.auth).expect(404);
    await api().get(`/v1/trips/${trip.id}/places/a%2Fb`).set(lea.auth).expect(400);
    const outsider = await createVerifiedUser(app, 'Thomas');
    await api().get(`/v1/trips/${trip.id}/places/fixed-alcazar`).set(outsider.auth).expect(404);
  });

  it('stores the picked place with its position, and drops it for a place typed freely', async () => {
    const trip = await newTrip();
    const idea = (
      await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: 'Balade', place: 'Plaza de España', placeId: 'fixed-plaza-espana' }).expect(201)
    ).body as Idea;
    expect(idea).toMatchObject({
      place: 'Plaza de España',
      placeId: 'fixed-plaza-espana',
      placeLocation: { address: 'Av. de Isabel la Católica, 41004 Séville, Espagne', lat: 37.3772, lng: -5.9869 },
    });

    // Planned: the event gets the same place.
    const event = (
      await api()
        .post(`/v1/trips/${trip.id}/events`)
        .set(lea.auth)
        .send({ title: 'Balade', startDate: '2026-10-20', ideaId: idea.id, place: idea.place, placeId: idea.placeId })
        .expect(201)
    ).body as TripEvent;
    expect(event).toMatchObject({ placeId: 'fixed-plaza-espana', placeLocation: { lat: 37.3772 } });

    // Searches now lean towards the trip's places, and say how far.
    const near = await search(trip.id, 'plaza de espa');
    expect(near[0]!.distanceMeters).toBe(0);
    expect(near[1]!.distanceMeters).toBeGreaterThan(90_000);

    // Other fields leave the place alone; a new name typed freely drops the picked place.
    const titled = (await api().patch(`/v1/trips/${trip.id}/events/${event.id}`).set(lea.auth).send({ title: 'Balade au parc' }).expect(200)).body as TripEvent;
    expect(titled).toMatchObject({ placeId: 'fixed-plaza-espana', placeLocation: { lat: 37.3772 } });
    // The whole form sent again with the same place: not looked up anew.
    await app.get(PrismaService).event.update({ where: { id: event.id }, data: { placeLat: 37.4 } });
    const resent = (
      await api().patch(`/v1/trips/${trip.id}/events/${event.id}`).set(lea.auth).send({ place: 'Plaza de España', placeId: 'fixed-plaza-espana' }).expect(200)
    ).body as TripEvent;
    expect(resent.placeLocation).toMatchObject({ lat: 37.4 });
    const typed = (await api().patch(`/v1/trips/${trip.id}/events/${event.id}`).set(lea.auth).send({ place: 'Chez Paco' }).expect(200)).body as TripEvent;
    expect(typed).toMatchObject({ place: 'Chez Paco', placeId: null, placeLocation: null });

    const cleared = (await api().patch(`/v1/trips/${trip.id}/ideas/${idea.id}`).set(lea.auth).send({ place: null, placeId: 'fixed-alcazar' }).expect(200)).body as Idea;
    expect(cleared).toMatchObject({ place: null, placeId: null, placeLocation: null });
  });

  it('refuses a place id alone, or one Google does not know', async () => {
    const trip = await newTrip();
    await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: 'Balade', placeId: 'fixed-alcazar' }).expect(400);
    await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: 'Balade', place: 'Nulle part', placeId: 'nowhere' }).expect(400);
  });

  it('refreshes cached positions within 30 days, and drops them once the trip is over', async () => {
    const prisma = app.get(PrismaService);
    const refresher = app.get(PlacesRefresher);
    const now = new Date('2026-11-09T12:00:00Z');

    const coming = await newTrip({ startDate: '2026-12-01', endDate: '2026-12-05' });
    const over = await newTrip({ startDate: '2026-10-01', endDate: '2026-10-05' });
    const place = { title: 'Alcázar', place: 'Real Alcázar', placeId: 'fixed-alcazar' };
    const fresh = (await api().post(`/v1/trips/${coming.id}/ideas`).set(lea.auth).send(place).expect(201)).body as Idea;
    const stale = (await api().post(`/v1/trips/${coming.id}/ideas`).set(lea.auth).send(place).expect(201)).body as Idea;
    const old = (await api().post(`/v1/trips/${over.id}/ideas`).set(lea.auth).send(place).expect(201)).body as Idea;

    // Saved without its position (Google was unreachable) or long ago, with a position that moved since.
    await prisma.idea.update({ where: { id: stale.id }, data: { placeLat: 1, placeLng: 1, placeRefreshedAt: new Date('2026-10-01T00:00:00Z') } });
    await prisma.idea.update({ where: { id: fresh.id }, data: { placeLat: null, placeLng: null, placeRefreshedAt: null } });

    await refresher.tick(now);

    const read = (id: string) => prisma.idea.findUniqueOrThrow({ where: { id } });
    expect(await read(stale.id)).toMatchObject({ placeLat: 37.3831, placeLng: -5.9902 });
    expect(await read(fresh.id)).toMatchObject({ placeLat: 37.3831, placeAddress: 'Patio de Banderas, 41004 Séville, Espagne' });
    expect(await read(old.id)).toMatchObject({ placeId: 'fixed-alcazar', placeAddress: null, placeLat: null, placeLng: null });
  });
});
