import type { INestApplication } from '@nestjs/common';
import {
  GUEST_TOKEN_HEADER,
  type CreateExpenseRequest,
  type Expense,
  type GuestJoinResponse,
  type TripBalances,
  type TripDetail,
  type TripInvitation,
  type UpdateExpenseRequest,
} from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Expenses (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  let thomas: TestUser;
  let camille: TestUser;
  const api = () => request(app.getHttpServer());
  const asGuest = (token: string) => ({ [GUEST_TOKEN_HEADER]: token });

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
    thomas = await createVerifiedUser(app, 'Thomas');
    camille = await createVerifiedUser(app, 'Camille');
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by Jordan, joined by Léa, Thomas and Camille; ids by first name. */
  async function newTrip() {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie' }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    for (const user of [lea, thomas, camille]) await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    const id = (name: string) => detail.participants.find((p) => p.displayName === name)!.id;
    return { trip, code, ids: { jordan: id('Jordan'), lea: id('Léa'), thomas: id('Thomas'), camille: id('Camille') } };
  }

  const add = async (tripId: string, headers: Record<string, string>, body: Partial<CreateExpenseRequest>, status = 201) =>
    (await api().post(`/v1/trips/${tripId}/expenses`).set(headers).send({ label: 'Dépense', date: '2027-07-12', ...body }).expect(status)).body as Expense;
  const balances = async (tripId: string, headers: Record<string, string>) =>
    (await api().get(`/v1/trips/${tripId}/balances`).set(headers).expect(200)).body as TripBalances;
  const balanceOf = (b: TripBalances, id: string) => b.people.find((p) => p.participant.id === id)!;

  it('separates what was advanced, the real cost and the balance (CDC §8, §15)', async () => {
    const { trip, ids } = await newTrip();
    const everyone = [ids.jordan, ids.lea, ids.thomas, ids.camille];
    // The example of the spec: 120 € shared by four, 30 € each.
    const resto = await add(trip.id, jordan.auth, { label: 'Resto', amountMinor: 12000, payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: everyone } });
    expect(resto.shares.map((s) => s.amountMinor)).toEqual([3000, 3000, 3000, 3000]);
    expect(resto.myShareMinor).toBe(3000);
    // The payer is not a beneficiary: Léa pays the museum for Thomas and Camille.
    await add(trip.id, lea.auth, { label: 'Musée', amountMinor: 2000, payerId: ids.lea, split: { mode: 'EQUAL', participantIds: [ids.thomas, ids.camille] } });
    // 10 € between three: the extra cent goes to the first who joined (Jordan).
    const coffee = await add(trip.id, thomas.auth, { label: 'Cafés', amountMinor: 1000, payerId: ids.thomas, split: { mode: 'EQUAL', participantIds: [ids.camille, ids.thomas, ids.jordan] } });
    expect(coffee.shares.map((s) => [s.participant.displayName, s.amountMinor])).toEqual([['Jordan', 334], ['Thomas', 333], ['Camille', 333]]);

    const b = await balances(trip.id, jordan.auth);
    expect(b.groupTotalMinor).toBe(15000);
    expect(b.sharedCount).toBe(3);
    expect(balanceOf(b, ids.lea)).toMatchObject({ paidMinor: 2000, costMinor: 3000, balanceMinor: -1000 });
    expect(balanceOf(b, ids.jordan)).toMatchObject({ paidMinor: 12000, costMinor: 3334, balanceMinor: 8666 });
    expect(b.people.reduce((sum, p) => sum + p.balanceMinor, 0)).toBe(0);
    expect(b.transfers.every((t) => t.to.id === ids.jordan)).toBe(true);
    expect(b.transfers.reduce((sum, t) => sum + t.amountMinor, 0)).toBe(8666);
  });

  it('keeps a personal expense private: in its author’s cost, never in the balances', async () => {
    const { trip, ids } = await newTrip();
    const fan = await add(trip.id, lea.auth, { label: 'Éventail', amountMinor: 1200, payerId: ids.lea, personal: true });
    expect(fan).toMatchObject({ personal: true, myShareMinor: 1200, canEdit: true });
    // Paid by someone else? A personal expense is always the author's.
    await add(trip.id, lea.auth, { label: 'Glace', amountMinor: 400, payerId: ids.jordan, personal: true }, 400);

    expect(((await api().get(`/v1/trips/${trip.id}/expenses`).set(jordan.auth).expect(200)).body as Expense[]).length).toBe(0);
    await api().get(`/v1/trips/${trip.id}/expenses/${fan.id}`).set(jordan.auth).expect(404);
    await api().delete(`/v1/trips/${trip.id}/expenses/${fan.id}`).set(jordan.auth).expect(404);

    const mine = await balances(trip.id, lea.auth);
    expect(mine.groupTotalMinor).toBe(0);
    expect(mine.me).toEqual({ paidMinor: 0, costMinor: 1200, balanceMinor: 0 });
    expect(mine.transfers).toEqual([]);
  });

  it('validates the split and who is on it', async () => {
    const { trip, ids } = await newTrip();
    const other = (await api().post('/v1/trips').set(camille.auth).send({ title: 'Ailleurs' }).expect(201)).body as TripDetail;
    const stranger = other.participants[0]!.id;

    const custom = await add(trip.id, jordan.auth, {
      amountMinor: 5000,
      payerId: ids.thomas,
      split: { mode: 'CUSTOM', shares: [{ participantId: ids.jordan, amountMinor: 3500 }, { participantId: ids.lea, amountMinor: 1500 }] },
    });
    expect(custom).toMatchObject({ splitMode: 'CUSTOM', payer: { displayName: 'Thomas' } });
    await add(trip.id, jordan.auth, { amountMinor: 5000, payerId: ids.jordan, split: { mode: 'CUSTOM', shares: [{ participantId: ids.lea, amountMinor: 100 }] } }, 400);
    await add(trip.id, jordan.auth, { amountMinor: 5000, payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [stranger] } }, 400);
    await add(trip.id, jordan.auth, { amountMinor: 5000, payerId: stranger, split: { mode: 'EQUAL', participantIds: [ids.lea] } }, 400);
    await add(trip.id, jordan.auth, { amountMinor: 5000, payerId: ids.jordan }, 400);
  });

  it('lets its author, its payer and the organizers change a shared expense', async () => {
    const { trip, ids } = await newTrip();
    const split = { mode: 'EQUAL' as const, participantIds: [ids.lea, ids.thomas] };
    const expense = await add(trip.id, lea.auth, { label: 'Taxi', amountMinor: 3000, payerId: ids.thomas, split });
    const edit = (headers: Record<string, string>, body: Partial<UpdateExpenseRequest>) =>
      api().put(`/v1/trips/${trip.id}/expenses/${expense.id}`).set(headers).send({ label: 'Taxi', date: '2027-07-12', amountMinor: 3000, payerId: ids.thomas, split, ...body });

    await edit(camille.auth, { amountMinor: 1 }).expect(403);
    await api().delete(`/v1/trips/${trip.id}/expenses/${expense.id}`).set(camille.auth).expect(403);
    expect(((await edit(thomas.auth, { amountMinor: 3200 }).expect(200)).body as Expense).shares.map((s) => s.amountMinor)).toEqual([1600, 1600]);
    await edit(jordan.auth, { label: 'Taxi aéroport', version: 2 }).expect(200);
    // Saved from a form opened before Jordan's change: refused rather than undoing it.
    await edit(thomas.auth, { amountMinor: 9900, version: 2 }).expect(409);
    // Making it personal changes who sees it: its author's call only.
    await edit(thomas.auth, { personal: true, payerId: ids.thomas }).expect(403);
    const listed = ((await api().get(`/v1/trips/${trip.id}/expenses`).set(camille.auth).expect(200)).body as Expense[])[0]!;
    expect(listed).toMatchObject({ label: 'Taxi aéroport', canEdit: false, myShareMinor: 0 });
    await api().delete(`/v1/trips/${trip.id}/expenses/${expense.id}`).set(lea.auth).expect(204);
  });

  it('records a reimbursement, which the two people or an organizer can cancel', async () => {
    const { trip, ids } = await newTrip();
    await add(trip.id, jordan.auth, { amountMinor: 4000, payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.jordan, ids.lea] } });
    const settle = (headers: Record<string, string>) =>
      api().post(`/v1/trips/${trip.id}/settlements`).set(headers).send({ fromId: ids.lea, toId: ids.jordan, amountMinor: 2000 });

    await settle(thomas.auth).expect(403);
    const settlement = (await settle(lea.auth).expect(201)).body as { id: string };
    // Confirmed again from Jordan's phone, before it refreshed: not counted twice.
    await settle(jordan.auth).expect(409);
    let b = await balances(trip.id, jordan.auth);
    expect(balanceOf(b, ids.lea).balanceMinor).toBe(0);
    expect(b.transfers).toEqual([]);
    expect(b.settlements[0]).toMatchObject({ amountMinor: 2000, from: { id: ids.lea }, canDelete: true });

    await api().delete(`/v1/trips/${trip.id}/settlements/${settlement.id}`).set(thomas.auth).expect(403);
    await api().delete(`/v1/trips/${trip.id}/settlements/${settlement.id}`).set(jordan.auth).expect(204);
    b = await balances(trip.id, jordan.auth);
    expect(b.transfers).toEqual([expect.objectContaining({ amountMinor: 2000, from: expect.objectContaining({ id: ids.lea }) })]);
  });

  it('lets the group pick another plan as short as the suggestion, until the balances move', async () => {
    const { trip, ids } = await newTrip();
    // Léa and Camille owe 30 € each, Jordan is owed 20 € and Thomas 40 €: several 3-transfer plans.
    const custom = (lea: number, camille: number) => ({ mode: 'CUSTOM' as const, shares: [{ participantId: ids.lea, amountMinor: lea }, { participantId: ids.camille, amountMinor: camille }] });
    await add(trip.id, jordan.auth, { amountMinor: 2000, payerId: ids.jordan, split: custom(1000, 1000) });
    await add(trip.id, thomas.auth, { amountMinor: 4000, payerId: ids.thomas, split: custom(2000, 2000) });
    const choose = (headers: Record<string, string>, plan: TripBalances['transfers']) =>
      api()
        .put(`/v1/trips/${trip.id}/balances/plan`)
        .set(headers)
        .send({ transfers: plan.map((t) => ({ fromId: t.from.id, toId: t.to.id, amountMinor: t.amountMinor })) });

    let b = await balances(trip.id, camille.auth);
    expect(b.plans.length).toBeGreaterThan(1);
    expect(b.planIndex).toBe(0);
    expect(b.transfers).toEqual(b.plans[0]);
    expect(b.plans.every((plan) => plan.length === 3)).toBe(true);

    // Any member chooses it, for everyone.
    const other = b.plans[1]!;
    b = (await choose(camille.auth, other).expect(200)).body as TripBalances;
    expect(b).toMatchObject({ planIndex: 1, transfers: other });
    expect((await balances(trip.id, jordan.auth)).transfers).toEqual(other);
    // A plan that does not square everyone, or a longer one, is refused.
    await choose(camille.auth, [{ ...other[0]!, amountMinor: other[0]!.amountMinor + 1 }, ...other.slice(1)]).expect(409);

    // One of its transfers done: the rest of the chosen plan is still what is shown.
    const [first, ...rest] = other;
    await api().post(`/v1/trips/${trip.id}/settlements`).set(jordan.auth).send({ fromId: first!.from.id, toId: first!.to.id, amountMinor: first!.amountMinor }).expect(201);
    b = await balances(trip.id, jordan.auth);
    expect(b.transfers).toEqual(expect.arrayContaining(rest));
    expect(b.transfers).toHaveLength(rest.length);

    // A new expense moves the balances: back to the suggestion.
    await add(trip.id, jordan.auth, { amountMinor: 900, payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.lea, ids.thomas, ids.camille] } });
    b = await balances(trip.id, jordan.auth);
    expect(b.planIndex).toBe(0);
    expect(b.transfers).toEqual(b.plans[0]);
  });

  it('moves a guest’s expenses to the account, adding up their shares on an expense both were in', async () => {
    const { trip, code, ids } = await newTrip();
    const { token } = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Léa invitée' }).expect(201)).body as GuestJoinResponse;
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    const guestId = detail.participants.find((p) => p.displayName === 'Léa invitée')!.id;
    const both = await add(trip.id, jordan.auth, { amountMinor: 3000, payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.jordan, ids.lea, guestId] } });
    // The guest owes Jordan 10 €, repays half, then pays the paella.
    await api().post(`/v1/trips/${trip.id}/settlements`).set(asGuest(token)).send({ fromId: guestId, toId: ids.jordan, amountMinor: 500 }).expect(201);
    await add(trip.id, asGuest(token), { label: 'Paella', amountMinor: 2000, payerId: guestId, split: { mode: 'EQUAL', participantIds: [guestId, ids.jordan] } });

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);

    const merged = (await api().get(`/v1/trips/${trip.id}/expenses/${both.id}`).set(lea.auth).expect(200)).body as Expense;
    expect(merged.shares.map((s) => [s.participant.displayName, s.amountMinor])).toEqual([['Jordan', 1000], ['Léa', 2000]]);
    // No longer equal parts: an edit must keep them as they are.
    expect(merged.splitMode).toBe('CUSTOM');
    const b = await balances(trip.id, lea.auth);
    expect(b.settlements).toEqual([expect.objectContaining({ amountMinor: 500, from: expect.objectContaining({ displayName: 'Léa' }) })]);
    expect(b.people.some((p) => p.participant.id === guestId)).toBe(false);
    // Léa now: paid 20 (the paella), costs 20 (both her shares of the first one) + 10 (paella),
    // repaid 5 → owes 5.
    expect(b.me).toEqual({ paidMinor: 2000, costMinor: 3000, balanceMinor: -500 });
    expect(b.people.reduce((sum, p) => sum + p.balanceMinor, 0)).toBe(0);
  });
});
