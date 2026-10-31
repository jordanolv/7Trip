import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { DEFAULT_NOTIFICATION_PREFS, formatMoney, type Expense, type Poll, type TripDetail, type TripEvent, type TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { NotificationsWorker } from '../src/notifications/notifications.worker.js';
import { PushService } from '../src/notifications/push.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let worker: NotificationsWorker;
  let push: PushService;
  let jordan: TestUser;
  let lea: TestUser;
  let thomas: TestUser;
  let camille: TestUser;
  const phones = new Map<TestUser, string>();
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    worker = app.get(NotificationsWorker);
    push = app.get(PushService);
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
    thomas = await createVerifiedUser(app, 'Thomas');
    // Camille has no phone registered.
    camille = await createVerifiedUser(app, 'Camille');
    for (const user of [jordan, lea, thomas]) {
      const token = `ExponentPushToken[${randomUUID()}]`;
      phones.set(user, token);
      await api().put('/v1/me/push-tokens').set(user.auth).send({ token, timeZone: 'Europe/Paris' }).expect(204);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by Jordan, joined by Léa, Thomas and Camille; participant ids by first name. */
  async function newTrip(dates: { startDate?: string; endDate?: string } = {}) {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie', ...dates }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    for (const user of [lea, thomas, camille]) await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    const detail = (await api().get(`/v1/trips/${trip.id}`).set(jordan.auth).expect(200)).body as TripDetail;
    const id = (name: string) => detail.participants.find((p) => p.displayName === name)!.id;
    return { trip, ids: { jordan: id('Jordan'), lea: id('Léa'), thomas: id('Thomas'), camille: id('Camille') } };
  }

  const pending = (participantIds: string[]) =>
    prisma.notification.findMany({ where: { participantId: { in: participantIds }, sentAt: null }, orderBy: { scheduledAt: 'asc' } });
  /** Messages sent to `user`'s phone during `run`. */
  async function sentDuring(run: () => Promise<void>) {
    const before = push.sent.length;
    await run();
    const messages = push.sent.slice(before);
    return (user: TestUser) => messages.filter((m) => m.to === phones.get(user));
  }

  it('keeps preferences per trip, over the defaults', async () => {
    const { trip } = await newTrip();
    const url = `/v1/trips/${trip.id}/notification-prefs`;
    expect((await api().get(url).set(lea.auth).expect(200)).body).toEqual(DEFAULT_NOTIFICATION_PREFS);
    const changed = (await api().put(url).set(lea.auth).send({ POLLS: false, EXPENSES: true }).expect(200)).body;
    expect(changed).toEqual({ ...DEFAULT_NOTIFICATION_PREFS, POLLS: false, EXPENSES: true });
    expect((await api().put(url).set(lea.auth).send({ DAILY: false }).expect(200)).body).toEqual({ ...changed, DAILY: false });
    // Only for Léa, only in this trip.
    expect((await api().get(url).set(thomas.auth).expect(200)).body).toEqual(DEFAULT_NOTIFICATION_PREFS);
    const other = (await newTrip()).trip;
    expect((await api().get(`/v1/trips/${other.id}/notification-prefs`).set(lea.auth).expect(200)).body).toEqual(DEFAULT_NOTIFICATION_PREFS);

    await api().put(url).set(lea.auth).send({ POLLS: 'non' }).expect(400);
    const stranger = await createVerifiedUser(app, 'Inconnu');
    await api().get(url).set(stranger.auth).expect(404);
  });

  it('gives a phone to the last account signed in on it, and forgets it on sign-out, even signed out already', async () => {
    const token = `ExponentPushToken[${randomUUID()}]`;
    const owner = await createVerifiedUser(app, 'Avant');
    const next = await createVerifiedUser(app, 'Après');
    await api().put('/v1/me/push-tokens').set(owner.auth).send({ token, timeZone: 'Europe/Paris' }).expect(204);
    await api().put('/v1/me/push-tokens').set(next.auth).send({ token, timeZone: 'America/New_York' }).expect(204);
    const stored = await prisma.pushToken.findUniqueOrThrow({ where: { token } });
    expect(stored).toMatchObject({ userId: next.session.user.id, timeZone: 'America/New_York' });

    // Signed out offline: the phone tells it later, without a session.
    await api().delete('/v1/me/push-tokens').send({ token }).expect(204);
    expect(await prisma.pushToken.count({ where: { token } })).toBe(0);
    await api().delete('/v1/me/push-tokens').send({ token: 'abc' }).expect(400);

    await api().put('/v1/me/push-tokens').set(owner.auth).send({ token: 'abc', timeZone: 'Europe/Paris' }).expect(400);
    await api().put('/v1/me/push-tokens').send({ token, timeZone: 'Europe/Paris' }).expect(401);
  });

  it('announces a new poll to the others, then reminds those who have not voted a day before it closes', async () => {
    const { trip, ids } = await newTrip();
    await api().put(`/v1/trips/${trip.id}/notification-prefs`).set(thomas.auth).send({ POLLS: false }).expect(200);
    const closesAt = new Date(Date.now() + 3 * 24 * 3600_000);
    const poll = (
      await api()
        .post(`/v1/trips/${trip.id}/polls`)
        .set(jordan.auth)
        .send({ question: 'Quel resto ?', options: [{ label: 'Eslava' }, { label: 'Bodega' }], closesAt: closesAt.toISOString() })
        .expect(201)
    ).body as Poll;

    const now = new Date();
    const to = await sentDuring(() => worker.sendDue(now));
    expect(to(lea)).toEqual([{ to: phones.get(lea), title: 'Andalousie', body: 'Jordan demande : Quel resto ?', data: { url: `/voyage/${trip.id}/sondage/${poll.id}` } }]);
    // Not the author, not Thomas (switched off); Camille has no phone.
    expect(to(jordan)).toEqual([]);
    expect(to(thomas)).toEqual([]);
    const camilleRow = await prisma.notification.findFirstOrThrow({ where: { participantId: ids.camille, kind: 'poll.created' } });
    expect(camilleRow.outcome).toBe('no-device');

    // The reminder waits until a day before the deadline; Léa votes in the meantime.
    const reminders = await prisma.notification.findMany({ where: { refId: poll.id, kind: 'poll.reminder' } });
    expect(reminders.map((r) => r.participantId).sort()).toEqual([ids.jordan, ids.lea, ids.camille].sort());
    expect(reminders[0]!.scheduledAt.getTime()).toBe(closesAt.getTime() - 24 * 3600_000);
    await api().put(`/v1/trips/${trip.id}/polls/${poll.id}/vote`).set(lea.auth).send({ optionIds: [poll.options[0]!.id] }).expect(200);

    const later = await sentDuring(() => worker.sendDue(new Date(closesAt.getTime() - 23 * 3600_000)));
    expect(later(jordan).map((m) => m.body)).toEqual(['Plus que 24 h pour voter : Quel resto ?']);
    expect(later(lea)).toEqual([]);
    expect((await prisma.notification.findFirstOrThrow({ where: { refId: poll.id, kind: 'poll.reminder', participantId: ids.lea } })).outcome).toBe('skipped');
  });

  it('tells the people of an event about the changes that move it, once for edits in a row', async () => {
    const { trip, ids } = await newTrip();
    const events = `/v1/trips/${trip.id}/events`;
    const event = (
      await api()
        .post(events)
        .set(jordan.auth)
        .send({ title: 'Alcázar', startDate: '2027-07-14', startTime: '10:00', participantIds: [ids.jordan, ids.lea] })
        .expect(201)
    ).body as TripEvent;
    // Only Léa: Jordan made the change, the others are not on it.
    let rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.kind])).toEqual([[ids.lea, 'event.created']]);

    // A description is not worth a notification.
    await api().patch(`${events}/${event.id}`).set(jordan.auth).send({ description: 'Prendre les billets' }).expect(200);
    // Moved within the minute: still one notification, about a new event, with the new time.
    await api().patch(`${events}/${event.id}`).set(jordan.auth).send({ startTime: '11:00', place: 'Real Alcázar' }).expect(200);
    rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.kind, r.body])).toEqual([[ids.lea, 'event.created', 'Nouveau : Alcázar — 14 juil. · 11:00 · Real Alcázar']]);

    // Not sent before the edits settle.
    expect((await sentDuring(() => worker.sendDue(new Date())))(lea)).toEqual([]);
    const sent = await sentDuring(() => worker.sendDue(new Date(Date.now() + 2 * 60_000)));
    expect(sent(lea).map((m) => m.data.url)).toEqual([`/voyage/${trip.id}/evenement/${event.id}`]);

    // Already told: a later move is a change; Léa moving it tells Jordan.
    await api().patch(`${events}/${event.id}`).set(lea.auth).send({ startTime: '12:00' }).expect(200);
    rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.kind])).toEqual([[ids.jordan, 'event.changed']]);
    // Removed: the change waiting becomes the removal.
    await api().delete(`${events}/${event.id}`).set(lea.auth).expect(204);
    rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.kind, r.body])).toEqual([[ids.jordan, 'event.deleted', 'Alcázar est retiré du planning (Léa)']]);

    // Created by Jordan, removed by Léa within the minute: the others never hear of it, Léa included;
    // Jordan, who knows it, learns it is gone.
    const quick = (await api().post(events).set(jordan.auth).send({ title: 'Tapas', startDate: '2027-07-15' }).expect(201)).body as TripEvent;
    expect((await pending([ids.lea])).map((r) => r.kind)).toEqual(['event.created']);
    await api().delete(`${events}/${quick.id}`).set(lea.auth).expect(204);
    expect((await pending(Object.values(ids))).filter((r) => r.refId === quick.id).map((r) => [r.participantId, r.kind])).toEqual([[ids.jordan, 'event.deleted']]);
    await prisma.notification.deleteMany({ where: { refId: quick.id } });
    // Moved by Léa before she was told of it: hers goes, Jordan's announcement is the one to make.
    const moved = (await api().post(events).set(jordan.auth).send({ title: 'Musée', startDate: '2027-07-15', participantIds: [ids.jordan, ids.lea] }).expect(201)).body as TripEvent;
    await api().patch(`${events}/${moved.id}`).set(lea.auth).send({ startTime: '15:00' }).expect(200);
    expect((await pending(Object.values(ids))).filter((r) => r.refId === moved.id).map((r) => [r.participantId, r.kind])).toEqual([[ids.jordan, 'event.changed']]);
    await prisma.notification.deleteMany({ where: { refId: moved.id } });

    // Created and removed within the minute: nobody hears of it.
    const brief = (await api().post(events).set(jordan.auth).send({ title: 'Flamenco', startDate: '2027-07-15' }).expect(201)).body as TripEvent;
    expect((await pending([ids.thomas])).map((r) => r.kind)).toEqual(['event.created']);
    await api().delete(`${events}/${brief.id}`).set(jordan.auth).expect(204);
    expect(await pending([ids.lea, ids.thomas])).toEqual([]);
  });

  it('tells about reimbursements, and about each expense only those who asked', async () => {
    const { trip, ids } = await newTrip();
    await api().put(`/v1/trips/${trip.id}/notification-prefs`).set(thomas.auth).send({ EXPENSES: true }).expect(200);
    const expense = (
      await api()
        .post(`/v1/trips/${trip.id}/expenses`)
        .set(jordan.auth)
        .send({ label: 'Resto', amountMinor: 9000, date: '2027-07-12', payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.jordan, ids.lea, ids.thomas] } })
        .expect(201)
    ).body as Expense;
    let rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.kind, r.body])).toEqual([[ids.thomas, 'expense.created', `Jordan a ajouté Resto · ${formatMoney(9000)}`]]);
    expect(rows[0]!.url).toBe(`/voyage/${trip.id}/depense/${expense.id}`);
    await worker.sendDue(new Date());

    // Léa says she paid Jordan back: Jordan hears of it.
    await api().post(`/v1/trips/${trip.id}/settlements`).set(lea.auth).send({ fromId: ids.lea, toId: ids.jordan, amountMinor: 3000 }).expect(201);
    rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.body])).toEqual([[ids.jordan, `Léa t’a remboursé ${formatMoney(3000)}`]]);
    await worker.sendDue(new Date());
    // Jordan confirms Thomas's: Thomas hears of it.
    await api().post(`/v1/trips/${trip.id}/settlements`).set(jordan.auth).send({ fromId: ids.thomas, toId: ids.jordan, amountMinor: 3000 }).expect(201);
    rows = await pending(Object.values(ids));
    expect(rows.map((r) => [r.participantId, r.body])).toEqual([[ids.thomas, `Jordan a bien reçu tes ${formatMoney(3000)}`]]);
  });

  it('sends the day’s programme in the morning during the trip, once, and what is owed after it', async () => {
    const { trip, ids } = await newTrip({ startDate: '2027-07-12', endDate: '2027-07-16' });
    const events = `/v1/trips/${trip.id}/events`;
    await api().post(events).set(jordan.auth).send({ title: 'Flamenco', startDate: '2027-07-14', startTime: '21:00' }).expect(201);
    await api().post(events).set(jordan.auth).send({ title: 'Alcázar', startDate: '2027-07-14', startTime: '10:00', participantIds: [ids.jordan, ids.lea] }).expect(201);
    await api()
      .post(`/v1/trips/${trip.id}/expenses`)
      .set(jordan.auth)
      .send({ label: 'Hôtel', amountMinor: 20000, date: '2027-07-12', payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.jordan, ids.lea] } })
      .expect(201);
    await prisma.notification.deleteMany({ where: { participantId: { in: Object.values(ids) } } });

    // 7:30 in Paris: too early.
    await worker.planReminders(new Date('2027-07-14T05:30:00Z'));
    expect(await prisma.notification.count({ where: { participantId: { in: Object.values(ids) } } })).toBe(0);

    // 9:30 in Paris. Camille has no phone; Thomas is not at the Alcázar.
    await worker.planReminders(new Date('2027-07-14T07:30:00Z'));
    await worker.planReminders(new Date('2027-07-14T07:35:00Z'));
    const daily = await prisma.notification.findMany({ where: { participantId: { in: Object.values(ids) }, kind: 'daily' } });
    const body = (id: string) => daily.filter((n) => n.participantId === id).map((n) => n.body);
    expect(body(ids.lea)).toEqual(['Jour 3 sur 5 — 2 au programme : 10:00 Alcázar, 21:00 Flamenco']);
    expect(body(ids.thomas)).toEqual(['Jour 3 sur 5 — 1 au programme : 21:00 Flamenco']);
    expect(body(ids.camille)).toEqual([]);

    // The day after the trip, Léa still owes 100,00 €; Jordan is owed, he gets nothing.
    await worker.planReminders(new Date('2027-07-17T09:00:00Z'));
    await worker.planReminders(new Date('2027-07-17T10:00:00Z'));
    const due = await prisma.notification.findMany({ where: { participantId: { in: Object.values(ids) }, kind: 'settlement.due' } });
    expect(due.map((n) => [n.participantId, n.body])).toEqual([[ids.lea, `Le voyage est fini : il te reste ${formatMoney(10000)} à rembourser`]]);

    // Léa pays half back before it goes out: told what is left, as it is when sent.
    await api().post(`/v1/trips/${trip.id}/settlements`).set(lea.auth).send({ fromId: ids.lea, toId: ids.jordan, amountMinor: 5000 }).expect(201);
    let to = await sentDuring(() => worker.sendDue(new Date('2027-07-17T10:05:00Z')));
    expect(to(lea).map((m) => m.body)).toEqual([`Le voyage est fini : il te reste ${formatMoney(5000)} à rembourser`]);
    // Paid back in full before it goes out: nothing is sent.
    await prisma.notification.updateMany({ where: { participantId: ids.lea, kind: 'settlement.due' }, data: { sentAt: null, outcome: null, claimedAt: null } });
    await api().post(`/v1/trips/${trip.id}/settlements`).set(lea.auth).send({ fromId: ids.lea, toId: ids.jordan, amountMinor: 5000 }).expect(201);
    to = await sentDuring(() => worker.sendDue(new Date('2027-07-17T10:10:00Z')));
    expect(to(lea)).toEqual([]);
  });

  it('forgets a phone that no longer takes notifications', async () => {
    const user = await createVerifiedUser(app, 'Ancien');
    const token = `ExponentPushToken[${randomUUID()}]`;
    await api().put('/v1/me/push-tokens').set(user.auth).send({ token, timeZone: 'Europe/Paris' }).expect(204);
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Lisbonne' }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    push.unregistered.add(token);
    await api()
      .post(`/v1/trips/${trip.id}/polls`)
      .set(jordan.auth)
      .send({ question: 'On part quand ?', options: [{ label: 'Mai' }, { label: 'Juin' }] })
      .expect(201);
    await worker.sendDue(new Date());
    expect(await prisma.pushToken.count({ where: { token } })).toBe(0);
  });

  it('forgets a phone that Apple or Google refused after Expo accepted the message', async () => {
    const user = await createVerifiedUser(app, 'Refusé');
    const token = `ExponentPushToken[${randomUUID()}]`;
    await api().put('/v1/me/push-tokens').set(user.auth).send({ token, timeZone: 'Europe/Paris' }).expect(204);
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Porto' }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    await api().post(`/v1/invitations/${code}/join`).set(user.auth).expect(201);
    push.refusedLater.add(token);
    await api()
      .post(`/v1/trips/${trip.id}/polls`)
      .set(jordan.auth)
      .send({ question: 'Train ou avion ?', options: [{ label: 'Train' }, { label: 'Avion' }] })
      .expect(201);
    const now = new Date();
    await worker.sendDue(now);
    expect(await prisma.pushTicket.count({ where: { token } })).toBe(1);

    // The receipts are read a quarter of an hour later.
    await worker.checkReceipts(new Date(now.getTime() + 60_000));
    expect(await prisma.pushToken.count({ where: { token } })).toBe(1);
    await worker.checkReceipts(new Date(now.getTime() + 20 * 60_000));
    expect(await prisma.pushToken.count({ where: { token } })).toBe(0);
    expect(await prisma.pushTicket.count({ where: { token } })).toBe(0);
  });

  it('keeps sending when Expo’s receipts cannot be read', async () => {
    const { trip } = await newTrip();
    await prisma.pushTicket.create({ data: { id: `old-${randomUUID()}`, token: 'ExponentPushToken[old]', createdAt: new Date(Date.now() - 3600_000) } });
    const receipts = vi.spyOn(push, 'receipts').mockRejectedValue(new Error('HTTP 503'));
    await api()
      .post(`/v1/trips/${trip.id}/polls`)
      .set(jordan.auth)
      .send({ question: 'Plage ou montagne ?', options: [{ label: 'Plage' }, { label: 'Montagne' }] })
      .expect(201);
    const to = await sentDuring(() => worker.tick());
    expect(receipts).toHaveBeenCalled();
    receipts.mockRestore();
    expect(to(lea).map((m) => m.body)).toEqual(['Jordan demande : Plage ou montagne ?']);
  });

  it('sends again later what Expo could not take, and only that', async () => {
    const { trip, ids } = await newTrip();
    push.unreachable.add(phones.get(lea)!);
    await api()
      .post(`/v1/trips/${trip.id}/polls`)
      .set(jordan.auth)
      .send({ question: 'Hôtel ou appart ?', options: [{ label: 'Hôtel' }, { label: 'Appart' }] })
      .expect(201);
    const now = new Date();
    let to = await sentDuring(() => worker.sendDue(now));
    expect(to(thomas)).toHaveLength(1);
    expect(to(lea)).toEqual([]);
    expect((await pending([ids.lea])).map((r) => r.kind)).toEqual(['poll.created']);

    push.unreachable.clear();
    // Claimed a few minutes: taken again after that, and only Léa's.
    to = await sentDuring(() => worker.sendDue(new Date(now.getTime() + 6 * 60_000)));
    expect(to(lea).map((m) => m.body)).toEqual(['Jordan demande : Hôtel ou appart ?']);
    expect(to(thomas)).toEqual([]);
  });

  it('drops what no longer holds when it is due: an expense turned personal, yesterday’s programme', async () => {
    const { trip, ids } = await newTrip({ startDate: '2027-08-01', endDate: '2027-08-05' });
    await api().put(`/v1/trips/${trip.id}/notification-prefs`).set(lea.auth).send({ EXPENSES: true }).expect(200);
    const body = { label: 'Cadeau', amountMinor: 3000, date: '2027-08-02', payerId: ids.jordan, split: { mode: 'EQUAL', participantIds: [ids.jordan, ids.lea] } };
    const expense = (await api().post(`/v1/trips/${trip.id}/expenses`).set(jordan.auth).send(body).expect(201)).body as Expense;
    await api().put(`/v1/trips/${trip.id}/expenses/${expense.id}`).set(jordan.auth).send({ ...body, personal: true }).expect(200);
    let to = await sentDuring(() => worker.sendDue(new Date()));
    expect(to(lea)).toEqual([]);
    expect((await prisma.notification.findFirstOrThrow({ where: { refId: expense.id, participantId: ids.lea } })).outcome).toBe('skipped');

    await api().post(`/v1/trips/${trip.id}/events`).set(jordan.auth).send({ title: 'Plage', startDate: '2027-08-03', startTime: '11:00' }).expect(201);
    await prisma.notification.deleteMany({ where: { participantId: { in: Object.values(ids) }, kind: 'event.created' } });
    // Planned at 9:30 in Paris on the 3rd; the worker only comes back the next morning.
    await worker.planReminders(new Date('2027-08-03T07:30:00Z'));
    expect(await prisma.notification.count({ where: { participantId: ids.lea, kind: 'daily', sentAt: null } })).toBe(1);
    to = await sentDuring(() => worker.sendDue(new Date('2027-08-04T07:00:00Z')));
    expect(to(lea)).toEqual([]);
    expect((await prisma.notification.findFirstOrThrow({ where: { participantId: ids.lea, kind: 'daily' } })).outcome).toBe('skipped');
  });
});
