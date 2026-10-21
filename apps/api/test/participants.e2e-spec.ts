import type { INestApplication } from '@nestjs/common';
import type { InvitationPreview, TripDetail, TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Invitations & participants (e2e)', () => {
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

  async function newTrip(body: Record<string, unknown> = {}) {
    const res = await api().post('/v1/trips').set(jordan.auth).send({ title: 'Lisbonne', ...body }).expect(201);
    return res.body as TripDetail;
  }

  async function invitationCode(tripId: string, user = jordan) {
    const res = await api().get(`/v1/trips/${tripId}/invitation`).set(user.auth).expect(200);
    return (res.body as TripInvitation).code;
  }

  async function join(tripId: string, user: TestUser) {
    const code = await invitationCode(tripId);
    const res = await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    return res.body as TripDetail;
  }

  it('shares one link per trip and lets someone join as participant (CDC §15)', async () => {
    const trip = await newTrip({ kind: 'SOLO' });
    const code = await invitationCode(trip.id);
    expect(code).toMatch(/^[a-z2-9]{10}$/);
    expect(await invitationCode(trip.id)).toBe(code);

    const preview = await api().get(`/v1/invitations/${code}`).set(lea.auth).expect(200);
    expect(preview.body as InvitationPreview).toMatchObject({
      tripId: trip.id,
      title: 'Lisbonne',
      participantCount: 1,
      organizers: ['Jordan'],
      alreadyMember: false,
    });

    const joined = await api().post(`/v1/invitations/${code.toUpperCase()}/join`).set(lea.auth).expect(201);
    const detail = joined.body as TripDetail;
    expect(detail.myRole).toBe('PARTICIPANT');
    expect(detail.kind).toBe('GROUP');
    expect(detail.participants.map((p) => [p.displayName, p.role])).toEqual([
      ['Jordan', 'ORGANIZER'],
      ['Léa', 'PARTICIPANT'],
    ]);

    // Joining twice changes nothing.
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    const after = await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(200);
    expect((after.body as TripDetail).participantCount).toBe(2);
  });

  it('stops accepting a renewed link, and only organizers can renew it', async () => {
    const trip = await newTrip();
    const oldCode = await invitationCode(trip.id);
    await join(trip.id, lea);

    await api().post(`/v1/trips/${trip.id}/invitation/renew`).set(lea.auth).expect(403);
    const renewed = await api().post(`/v1/trips/${trip.id}/invitation/renew`).set(jordan.auth).expect(201);
    const newCode = (renewed.body as TripInvitation).code;
    expect(newCode).not.toBe(oldCode);

    const thomas = await createVerifiedUser(app, 'Thomas');
    const refused = await api().post(`/v1/invitations/${oldCode}/join`).set(thomas.auth).expect(404);
    expect(refused.body.code).toBe('INVITATION_INVALID');
    await api().get(`/v1/invitations/${oldCode}`).set(thomas.auth).expect(404);
    await api().post(`/v1/invitations/${newCode}/join`).set(thomas.auth).expect(201);
  });

  it('follows the invite policy for participants', async () => {
    const trip = await newTrip();
    await join(trip.id, lea);

    expect(await invitationCode(trip.id, lea)).toBeTruthy();
    await api().patch(`/v1/trips/${trip.id}`).set(lea.auth).send({ invitePolicy: 'ORGANIZERS' }).expect(403);
    const updated = await api().patch(`/v1/trips/${trip.id}`).set(jordan.auth).send({ invitePolicy: 'ORGANIZERS' }).expect(200);
    expect((updated.body as TripDetail).invitePolicy).toBe('ORGANIZERS');
    await api().get(`/v1/trips/${trip.id}/invitation`).set(lea.auth).expect(403);
  });

  it('changes roles but always keeps an organizer', async () => {
    const trip = await newTrip();
    const joined = await join(trip.id, lea);
    const leaId = joined.participants.find((p) => p.isMe)!.id;
    const jordanId = joined.participants.find((p) => !p.isMe)!.id;

    await api().patch(`/v1/trips/${trip.id}/participants/${jordanId}`).set(lea.auth).send({ role: 'PARTICIPANT' }).expect(403);
    const last = await api().patch(`/v1/trips/${trip.id}/participants/${jordanId}`).set(jordan.auth).send({ role: 'PARTICIPANT' }).expect(409);
    expect(last.body.code).toBe('LAST_ORGANIZER');

    await api().patch(`/v1/trips/${trip.id}/participants/${leaId}`).set(jordan.auth).send({ role: 'ORGANIZER' }).expect(200);
    const demoted = await api().patch(`/v1/trips/${trip.id}/participants/${jordanId}`).set(jordan.auth).send({ role: 'PARTICIPANT' }).expect(200);
    expect((demoted.body as TripDetail).myRole).toBe('PARTICIPANT');
  });

  it('lets an organizer remove someone, who loses access but can come back with the link', async () => {
    const trip = await newTrip();
    const joined = await join(trip.id, lea);
    const leaId = joined.participants.find((p) => p.isMe)!.id;
    const jordanId = joined.participants.find((p) => !p.isMe)!.id;

    await api().delete(`/v1/trips/${trip.id}/participants/${jordanId}`).set(lea.auth).expect(403);
    await api().delete(`/v1/trips/${trip.id}/participants/${jordanId}`).set(jordan.auth).expect(400);
    const removed = await api().delete(`/v1/trips/${trip.id}/participants/${leaId}`).set(jordan.auth).expect(200);
    expect((removed.body as TripDetail).participantCount).toBe(1);

    await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(404);
    const back = await join(trip.id, lea);
    expect(back.myRole).toBe('PARTICIPANT');
  });

  it('lets participants leave, but not the last organizer', async () => {
    const trip = await newTrip();
    const alone = await api().post(`/v1/trips/${trip.id}/leave`).set(jordan.auth).expect(409);
    expect(alone.body.message).toContain('supprime-le');

    await join(trip.id, lea);
    const lastOrganizer = await api().post(`/v1/trips/${trip.id}/leave`).set(jordan.auth).expect(409);
    expect(lastOrganizer.body.code).toBe('LAST_ORGANIZER');

    await api().post(`/v1/trips/${trip.id}/leave`).set(lea.auth).expect(204);
    await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(404);
    const list = await api().get('/v1/me/trips').set(lea.auth).expect(200);
    expect((list.body as { id: string }[]).map((t) => t.id)).not.toContain(trip.id);
  });

  it('hides invitations of other trips', async () => {
    const trip = await newTrip();
    await api().get(`/v1/trips/${trip.id}/invitation`).set(lea.auth).expect(404);
    await api().get('/v1/invitations/abcdefghjk').set(lea.auth).expect(404);
  });
});
