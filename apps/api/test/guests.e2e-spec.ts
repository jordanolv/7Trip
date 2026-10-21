import type { INestApplication } from '@nestjs/common';
import { GUEST_TOKEN_HEADER, type GuestJoinResponse, type InvitationPreview, type TripDetail, type TripInvitation, type TripSummary } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Guests (e2e)', () => {
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

  async function newTrip(body: Record<string, unknown> = {}) {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Lisbonne', ...body }).expect(201)).body as TripDetail;
    const code = ((await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation).code;
    return { trip, code };
  }

  async function joinAsGuest(code: string, displayName = 'Tom') {
    return (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName }).expect(201)).body as GuestJoinResponse;
  }

  it('lets someone join without an account and see the trip (CDC §15)', async () => {
    const { trip, code } = await newTrip({ kind: 'SOLO' });

    const preview = await api().get(`/v1/invitations/${code}`).expect(200);
    expect(preview.body as InvitationPreview).toMatchObject({ tripId: trip.id, organizers: ['Jordan'], alreadyMember: false });

    const { token, trip: joined } = await joinAsGuest(code, '  Tom ');
    expect(joined.kind).toBe('GROUP');
    expect(joined.myRole).toBe('PARTICIPANT');
    expect(joined.participants.find((p) => p.isMe)).toMatchObject({ displayName: 'Tom', isGuest: true });

    const seen = (await api().get(`/v1/trips/${trip.id}`).set(asGuest(token)).expect(200)).body as TripDetail;
    expect(seen.participants.map((p) => [p.displayName, p.isGuest, p.isMe])).toEqual([
      ['Jordan', false, false],
      ['Tom', true, true],
    ]);
    const byOrganizer = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    expect(byOrganizer.participants.find((p) => p.displayName === 'Tom')?.isMe).toBe(false);
  });

  it('opens only its own trip, and none of the management actions', async () => {
    const { trip, code } = await newTrip({ invitePolicy: 'ALL' });
    const other = await newTrip();
    const { token } = await joinAsGuest(code);

    await api().get(`/v1/trips/${other.trip.id}`).set(asGuest(token)).expect(404);
    await api().get('/v1/me/trips').set(asGuest(token)).expect(401);
    await api().get(`/v1/trips/${trip.id}`).set(asGuest('not-a-token')).expect(401);
    await api().get(`/v1/trips/${trip.id}/invitation`).set(asGuest(token)).expect(403);
    await api().patch(`/v1/trips/${trip.id}`).set(asGuest(token)).send({ title: 'Porto' }).expect(403);
    await api().delete(`/v1/trips/${trip.id}`).set(asGuest(token)).expect(403);
  });

  it('ends the session when the guest leaves or is removed, and cannot be promoted', async () => {
    const { trip, code } = await newTrip();
    const tom = await joinAsGuest(code, 'Tom');
    const zoe = await joinAsGuest(code, 'Zoé');
    const tomId = tom.trip.participants.find((p) => p.isMe)!.id;

    const promote = await api().patch(`/v1/trips/${trip.id}/participants/${tomId}`).set(jordan.auth).send({ role: 'ORGANIZER' }).expect(400);
    expect(promote.body.message).toContain('créer un compte');

    await api().delete(`/v1/trips/${trip.id}/participants/${tomId}`).set(jordan.auth).expect(200);
    await api().get(`/v1/trips/${trip.id}`).set(asGuest(tom.token)).expect(401);

    await api().post(`/v1/trips/${trip.id}/leave`).set(asGuest(zoe.token)).expect(204);
    await api().get(`/v1/trips/${trip.id}`).set(asGuest(zoe.token)).expect(401);
  });

  it('keeps the guest participation when the guest creates an account (CDC §15)', async () => {
    const { trip, code } = await newTrip();
    const { token, trip: joined } = await joinAsGuest(code, 'Léa en invitée');
    const guestId = joined.participants.find((p) => p.isMe)!.id;

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token, 'unknown-token'] }).expect(204);

    const mine = (await api().get('/v1/me/trips').set(lea.auth).expect(200)).body as TripSummary[];
    expect(mine.map((t) => t.id)).toContain(trip.id);
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(200)).body as TripDetail;
    // Same participant row: whatever it owns stays attached.
    expect(detail.participants.find((p) => p.isMe)).toMatchObject({ id: guestId, displayName: 'Léa', isGuest: false });
    await api().get(`/v1/trips/${trip.id}`).set(asGuest(token)).expect(401);
  });

  it('merges a guest session into an existing membership of the account', async () => {
    const { trip, code } = await newTrip();
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    const { token } = await joinAsGuest(code, 'Léa bis');

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);

    const detail = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    expect(detail.participants.map((p) => p.displayName)).toEqual(['Jordan', 'Léa']);
  });

  it('lets an account that left come back through a guest session', async () => {
    const { trip, code } = await newTrip();
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    await api().post(`/v1/trips/${trip.id}/leave`).set(lea.auth).expect(204);
    const { token } = await joinAsGuest(code, 'Léa');

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);

    const detail = (await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(200)).body as TripDetail;
    expect(detail.participants.filter((p) => p.isMe)).toHaveLength(1);
  });

  it('validates the guest name and rejects a revoked link', async () => {
    const { trip, code } = await newTrip();
    await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: '   ' }).expect(400);
    await api().post(`/v1/trips/${trip.id}/invitation/renew`).set(jordan.auth).expect(201);
    await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Tom' }).expect(404);
  });
});
