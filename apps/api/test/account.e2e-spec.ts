import type { INestApplication } from '@nestjs/common';
import {
  FORMER_PARTICIPANT_NAME,
  GUEST_TOKEN_HEADER,
  type Expense,
  type GuestJoinResponse,
  type Idea,
  type TripDetail,
  type TripDocument,
  type TripInvitation,
} from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Account data (e2e)', () => {
  let app: INestApplication<App>;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by `owner`, joined by `others`; participant ids by first name. */
  async function groupTrip(owner: TestUser, others: TestUser[], title = 'Lisbonne') {
    const trip = (await api().post('/v1/trips').set(owner.auth).send({ title }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(owner.auth).expect(200)).body as TripInvitation;
    for (const user of others) await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(owner.auth).expect(200)).body as TripDetail;
    const id = (name: string) => detail.participants.find((p) => p.displayName === name)!.id;
    return { trip, code, id };
  }

  it('exports what the account wrote, trip by trip', async () => {
    const jordan = await createVerifiedUser(app, 'Jordan');
    const lea = await createVerifiedUser(app, 'Léa');
    const { trip, id } = await groupTrip(jordan, [lea]);
    await api().post(`/v1/trips/${trip.id}/ideas`).set(lea.auth).send({ title: 'Pastéis de Belém' }).expect(201);
    await api()
      .post(`/v1/trips/${trip.id}/expenses`)
      .set(lea.auth)
      .send({ label: 'Tram 28', amountMinor: 600, date: '2027-07-12', payerId: id('Léa'), split: { mode: 'EQUAL', participantIds: [id('Léa'), id('Jordan')] } })
      .expect(201);

    await api().get('/v1/me/export').expect(401);
    const data = (await api().get('/v1/me/export').set(lea.auth).expect(200)).body;
    expect(data.account).toMatchObject({ displayName: 'Léa', emailVerified: true });
    expect(data.trips).toHaveLength(1);
    expect(data.trips[0]).toMatchObject({
      trip: { title: 'Lisbonne' },
      participation: { role: 'PARTICIPANT', status: 'ACTIVE' },
      ideas: [{ title: 'Pastéis de Belém' }],
      expensesPaid: [{ label: 'Tram 28', amountMinor: 600 }],
      shares: [{ expense: 'Tram 28', amountMinor: 300 }],
    });
    // Nothing that belongs to the others: Jordan's own content is not in Léa's export.
    expect(JSON.stringify(data)).not.toContain(jordan.session.user.email);
  });

  it('asks for the password again', async () => {
    const lea = await createVerifiedUser(app, 'Léa');
    await api().delete('/v1/me').set(lea.auth).send({}).expect(400);
    const wrong = await api().delete('/v1/me').set(lea.auth).send({ password: 'pas-le-bon' }).expect(400);
    expect(wrong.body).toMatchObject({ fields: { password: 'Mot de passe incorrect' } });
    await api().get('/v1/me').set(lea.auth).expect(200);
  });

  it('leaves the group trips coherent and removes what only the account could see', async () => {
    const jordan = await createVerifiedUser(app, 'Jordan');
    const lea = await createVerifiedUser(app, 'Léa');
    const { trip, code, id } = await groupTrip(jordan, [lea]);
    const solo = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Seul à Rome' }).expect(201)).body as TripDetail;
    // A trip where only a guest would be left goes too.
    const withGuest = await groupTrip(jordan, [], 'Avec Inès');
    await api().post(`/v1/invitations/${withGuest.code}/join-guest`).send({ displayName: 'Inès' }).expect(201);

    const shared = (
      await api()
        .post(`/v1/trips/${trip.id}/expenses`)
        .set(jordan.auth)
        .send({ label: 'Resto', amountMinor: 4000, date: '2027-07-12', payerId: id('Jordan'), split: { mode: 'EQUAL', participantIds: [id('Jordan'), id('Léa')] } })
        .expect(201)
    ).body as Expense;
    await api()
      .post(`/v1/trips/${trip.id}/expenses`)
      .set(jordan.auth)
      .send({ label: 'Souvenir', amountMinor: 900, date: '2027-07-12', payerId: id('Jordan'), personal: true })
      .expect(201);
    const idea = (await api().post(`/v1/trips/${trip.id}/ideas`).set(jordan.auth).send({ title: 'Miradouro' }).expect(201)).body as Idea;
    await api().post(`/v1/trips/${trip.id}/documents/links`).set(jordan.auth).send({ title: 'Mon assurance', url: 'assurance.fr' }).expect(201);
    await api().post(`/v1/trips/${trip.id}/documents/links`).set(jordan.auth).send({ title: 'Location', url: 'airbnb.fr', visibility: 'SHARED' }).expect(201);

    await api().delete('/v1/me').set(jordan.auth).send({ password: jordan.password }).expect(204);

    // The account is gone: no more sign-in, and its token is refused.
    await api().post('/v1/auth/login').send({ email: jordan.session.user.email, password: jordan.password }).expect(401);
    await api().get('/v1/me').set(jordan.auth).expect(401);

    // Léa keeps the trip, now as its organizer; Jordan is an anonymous former participant.
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(200)).body as TripDetail;
    expect(detail.participants.map((p) => [p.displayName, p.role])).toEqual([['Léa', 'ORGANIZER']]);
    const expenses = (await api().get(`/v1/trips/${trip.id}/expenses`).set(lea.auth).expect(200)).body as Expense[];
    expect(expenses.map((e) => e.id)).toEqual([shared.id]);
    expect(expenses[0]!.payer).toMatchObject({ displayName: FORMER_PARTICIPANT_NAME, hasLeft: true });
    const ideas = (await api().get(`/v1/trips/${trip.id}/ideas`).set(lea.auth).expect(200)).body as Idea[];
    expect(ideas.find((i) => i.id === idea.id)?.author.displayName).toBe(FORMER_PARTICIPANT_NAME);
    const documents = (await api().get(`/v1/trips/${trip.id}/documents`).set(lea.auth).expect(200)).body as TripDocument[];
    expect(documents.map((d) => d.title)).toEqual(['Location']);

    // The group link Jordan created still works.
    const newcomer = await createVerifiedUser(app, 'Thomas');
    await api().post(`/v1/invitations/${code}/join`).set(newcomer.auth).expect(201);

    // The solo trip and the guest-only one are deleted.
    const guest = (await api().post(`/v1/invitations/${withGuest.code}/join-guest`).send({ displayName: 'Paul' })).status;
    expect(guest).toBe(404);
    const left = await app.get(PrismaService).trip.findMany({ where: { id: { in: [solo.id, withGuest.trip.id] } } });
    expect(left).toEqual([]);
  });

  it('keeps a guest session working in a trip the account leaves', async () => {
    const jordan = await createVerifiedUser(app, 'Jordan');
    const lea = await createVerifiedUser(app, 'Léa');
    const { trip, code } = await groupTrip(jordan, [lea]);
    const ines = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Inès' }).expect(201)).body as GuestJoinResponse;

    await api().delete('/v1/me').set(lea.auth).send({ password: lea.password }).expect(204);

    const asInes = (await api().get(`/v1/trips/${trip.id}`).set({ [GUEST_TOKEN_HEADER]: ines.token }).expect(200)).body as TripDetail;
    expect(asInes.participants.map((p) => [p.displayName, p.role])).toEqual([
      ['Jordan', 'ORGANIZER'],
      ['Inès', 'PARTICIPANT'],
    ]);
  });
});
