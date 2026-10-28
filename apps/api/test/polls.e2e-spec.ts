import type { INestApplication } from '@nestjs/common';
import { GUEST_TOKEN_HEADER, type GuestJoinResponse, type Idea, type Poll, type TripDetail, type TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

describe('Polls (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  let thomas: TestUser;
  let outsider: TestUser;
  const api = () => request(app.getHttpServer());
  const asGuest = (token: string) => ({ [GUEST_TOKEN_HEADER]: token });

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
    thomas = await createVerifiedUser(app, 'Thomas');
    outsider = await createVerifiedUser(app, 'Max');
  });

  afterAll(async () => {
    await app.close();
  });

  /** A trip organised by Jordan, joined by Léa and Thomas. */
  async function newTrip() {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Été entre potes' }).expect(201)).body as TripDetail;
    const code = ((await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation).code;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    await api().post(`/v1/invitations/${code}/join`).set(thomas.auth).expect(201);
    return { trip, code };
  }

  const options = (...labels: string[]) => labels.map((label) => ({ label }));

  async function create(tripId: string, headers: Record<string, string>, body: Record<string, unknown>) {
    return (await api().post(`/v1/trips/${tripId}/polls`).set(headers).send(body).expect(201)).body as Poll;
  }

  const vote = (tripId: string, pollId: string, headers: Record<string, string>, optionIds: string[]) =>
    api().put(`/v1/trips/${tripId}/polls/${pollId}/vote`).set(headers).send({ optionIds });

  const get = async (tripId: string, pollId: string, headers: Record<string, string>) =>
    (await api().get(`/v1/trips/${tripId}/polls/${pollId}`).set(headers).expect(200)).body as Poll;

  it('runs a multiple-choice poll: votes change while open, results show once voted (CDC §15)', async () => {
    const { trip } = await newTrip();
    const poll = await create(trip.id, lea.auth, { kind: 'DESTINATION', question: 'Où part-on cet été ?', options: options('Split', 'Naxos', 'Cefalù'), multiple: true });
    expect(poll).toMatchObject({ multiple: true, closed: false, hasVoted: false, resultsVisible: false, voterCount: 0, eligibleCount: 3 });
    expect(poll.options.map((o) => o.votes)).toEqual([null, null, null]);
    const [split, naxos, cefalu] = poll.options.map((o) => o.id) as [string, string, string];

    const voted = (await vote(trip.id, poll.id, jordan.auth, [split, naxos]).expect(200)).body as Poll;
    expect(voted).toMatchObject({ hasVoted: true, resultsVisible: true, voterCount: 1 });
    expect(voted.options.map((o) => [o.votes, o.mine])).toEqual([[1, true], [1, true], [0, false]]);
    expect(voted.waiting.map((p) => p.displayName)).toEqual(['Léa', 'Thomas']);

    // Thomas has not voted: he sees who voted, not what.
    const forThomas = await get(trip.id, poll.id, thomas.auth);
    expect(forThomas).toMatchObject({ resultsVisible: false, voterCount: 1 });
    expect(forThomas.options[0]!.voters).toBeNull();

    await vote(trip.id, poll.id, thomas.auth, [cefalu]).expect(200);
    const changed = (await vote(trip.id, poll.id, jordan.auth, [split]).expect(200)).body as Poll;
    expect(changed.options.map((o) => o.votes)).toEqual([1, 0, 1]);
    expect(changed.options[0]!.voters!.map((v) => v.displayName)).toEqual(['Jordan']);

    // An empty vote withdraws it.
    const withdrawn = (await vote(trip.id, poll.id, jordan.auth, []).expect(200)).body as Poll;
    expect(withdrawn).toMatchObject({ hasVoted: false, resultsVisible: false, voterCount: 1 });
  });

  it('takes a single choice by default and only options of the poll', async () => {
    const { trip } = await newTrip();
    const poll = await create(trip.id, jordan.auth, { question: 'Resto ce soir ?', options: options('Tapas', 'Pizza') });
    const [tapas, pizza] = poll.options.map((o) => o.id) as [string, string];
    expect(poll.multiple).toBe(false);
    await vote(trip.id, poll.id, lea.auth, [tapas, pizza]).expect(400);
    const other = await create(trip.id, jordan.auth, { question: 'Autre ?', options: options('A', 'B') });
    await vote(trip.id, poll.id, lea.auth, [other.options[0]!.id]).expect(400);
    await vote(trip.id, poll.id, lea.auth, [pizza]).expect(200);

    await api().post(`/v1/trips/${trip.id}/polls`).set(lea.auth).send({ question: 'Seul ?', options: options('A') }).expect(400);
    await api()
      .post(`/v1/trips/${trip.id}/polls`)
      .set(lea.auth)
      .send({ question: 'Trop tard ?', options: options('A', 'B'), closesAt: new Date(Date.now() - 60_000).toISOString() })
      .expect(400);
  });

  it('lets only organizers close; a closed poll takes no more votes', async () => {
    const { trip } = await newTrip();
    const poll = await create(trip.id, lea.auth, { question: 'Plage ou rando ?', options: options('Plage', 'Rando') });
    expect(poll.canClose).toBe(false);
    await api().post(`/v1/trips/${trip.id}/polls/${poll.id}/close`).set(lea.auth).expect(403);

    const closed = (await api().post(`/v1/trips/${trip.id}/polls/${poll.id}/close`).set(jordan.auth).expect(200)).body as Poll;
    expect(closed).toMatchObject({ closed: true, closedBy: { displayName: 'Jordan' }, resultsVisible: true, canClose: false });
    const refused = await vote(trip.id, poll.id, thomas.auth, [poll.options[0]!.id]).expect(409);
    expect(refused.body).toMatchObject({ code: 'POLL_CLOSED' });
  });

  it('applies the option an organizer confirms: destination, dates, idea kept (CDC §6)', async () => {
    const { trip } = await newTrip();
    const close = (pollId: string) => api().post(`/v1/trips/${trip.id}/polls/${pollId}/close`).set(jordan.auth).expect(200);
    const apply = (pollId: string, optionId: string, headers = jordan.auth) =>
      api().post(`/v1/trips/${trip.id}/polls/${pollId}/apply`).set(headers).send({ optionId });

    const where = await create(trip.id, lea.auth, { kind: 'DESTINATION', question: 'Où ?', options: options('Split', 'Naxos') });
    // Nothing is applied before the poll is closed, nor by someone who is not an organizer.
    await apply(where.id, where.options[0]!.id).expect(409);
    await close(where.id);
    await apply(where.id, where.options[0]!.id, lea.auth).expect(403);
    expect(((await apply(where.id, where.options[0]!.id).expect(200)).body as Poll).appliedOptionId).toBe(where.options[0]!.id);

    const when = await create(trip.id, lea.auth, {
      kind: 'DATES',
      question: 'Quand ?',
      options: [
        { label: 'Juillet', startDate: '2027-07-12', endDate: '2027-07-19' },
        { label: 'Août', startDate: '2027-08-02', endDate: '2027-08-09' },
      ],
    });
    expect(when.options[1]).toMatchObject({ startDate: '2027-08-02', endDate: '2027-08-09' });
    await close(when.id);
    await apply(when.id, when.options[1]!.id).expect(200);

    const tapas = (await api().post(`/v1/trips/${trip.id}/ideas`).set(thomas.auth).send({ title: 'Tapas' }).expect(201)).body as Idea;
    const food = await create(trip.id, thomas.auth, { kind: 'FOOD', question: 'Où mange-t-on ?', options: [{ label: 'Tapas', ideaId: tapas.id }, { label: 'Pizza' }] });
    await close(food.id);
    await apply(food.id, food.options[0]!.id).expect(200);
    // Pizza is no idea: there is nothing to apply.
    await apply(food.id, food.options[1]!.id).expect(400);

    const detail = (await api().get(`/v1/trips/${trip.id}`).set(lea.auth).expect(200)).body as TripDetail;
    expect(detail).toMatchObject({ destinations: ['Split'], startDate: '2027-08-02', endDate: '2027-08-09' });
    const idea = (await api().get(`/v1/trips/${trip.id}/ideas/${tapas.id}`).set(lea.auth).expect(200)).body as Idea;
    expect(idea.status).toBe('KEPT');
  });

  it('opens a shared link for members only, guests included', async () => {
    const { trip, code } = await newTrip();
    const poll = await create(trip.id, lea.auth, { question: 'Plage ?', options: options('Oui', 'Non') });

    expect(((await api().get(`/v1/polls/${poll.id}`).set(thomas.auth).expect(200)).body as Poll).tripId).toBe(trip.id);
    await api().get(`/v1/polls/${poll.id}`).set(outsider.auth).expect(404);
    await api().get('/v1/polls/not-a-uuid').set(thomas.auth).expect(404);

    const { token } = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Inès' }).expect(201)).body as GuestJoinResponse;
    await api().get(`/v1/polls/${poll.id}`).set(asGuest(token)).expect(200);
    await vote(trip.id, poll.id, asGuest(token), [poll.options[0]!.id]).expect(200);

    // A guest of another trip does not see it.
    const other = await newTrip();
    const { token: otherToken } = (await api().post(`/v1/invitations/${other.code}/join-guest`).send({ displayName: 'Hugo' }).expect(201))
      .body as GuestJoinResponse;
    await api().get(`/v1/polls/${poll.id}`).set(asGuest(otherToken)).expect(404);
  });

  it('lets its author or an organizer delete it', async () => {
    const { trip } = await newTrip();
    const poll = await create(trip.id, lea.auth, { question: 'Plage ?', options: options('Oui', 'Non') });
    await api().delete(`/v1/trips/${trip.id}/polls/${poll.id}`).set(thomas.auth).expect(403);
    await api().delete(`/v1/trips/${trip.id}/polls/${poll.id}`).set(lea.auth).expect(204);
    await api().get(`/v1/trips/${trip.id}/polls/${poll.id}`).set(lea.auth).expect(404);
  });

  it('moves a guest’s polls and votes to the account, keeping the account’s vote on a poll both voted in', async () => {
    const { trip, code } = await newTrip();
    const both = await create(trip.id, jordan.auth, { question: 'Plage ?', options: options('Oui', 'Non') });
    const onlyGuest = await create(trip.id, jordan.auth, { question: 'Rando ?', options: options('Oui', 'Non') });
    const { token } = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Léa invitée' }).expect(201)).body as GuestJoinResponse;
    await vote(trip.id, both.id, asGuest(token), [both.options[1]!.id]).expect(200);
    await vote(trip.id, onlyGuest.id, asGuest(token), [onlyGuest.options[0]!.id]).expect(200);
    const guestPoll = await create(trip.id, asGuest(token), { question: 'Musée ?', options: options('Oui', 'Non') });
    await vote(trip.id, both.id, lea.auth, [both.options[0]!.id]).expect(200);

    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);

    const after = await get(trip.id, both.id, lea.auth);
    expect(after.options.map((o) => [o.votes, o.mine])).toEqual([[1, true], [0, false]]);
    expect((await get(trip.id, onlyGuest.id, lea.auth)).options[0]!.mine).toBe(true);
    expect((await get(trip.id, guestPoll.id, lea.auth)).author.displayName).toBe('Léa');
  });
});
