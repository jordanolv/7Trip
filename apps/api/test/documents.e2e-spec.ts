import type { INestApplication } from '@nestjs/common';
import { GUEST_TOKEN_HEADER, type DocumentFileUrl, type GuestJoinResponse, type TripDetail, type TripDocument, type TripEvent, type TripInvitation } from '@7trip/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';
import { createVerifiedUser, type TestUser } from './helpers.js';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\n%%EOF\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);

describe('Documents (e2e)', () => {
  let app: INestApplication<App>;
  let jordan: TestUser;
  let lea: TestUser;
  let thomas: TestUser;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    jordan = await createVerifiedUser(app, 'Jordan');
    lea = await createVerifiedUser(app, 'Léa');
    thomas = await createVerifiedUser(app, 'Thomas');
  });

  afterAll(async () => {
    await app.close();
  });

  /** Jordan organises, Léa joins; Thomas is not in it. */
  async function newTrip() {
    const trip = (await api().post('/v1/trips').set(jordan.auth).send({ title: 'Andalousie' }).expect(201)).body as TripDetail;
    const { code } = (await api().get(`/v1/trips/${trip.id}/invitation`).set(jordan.auth).expect(200)).body as TripInvitation;
    await api().post(`/v1/invitations/${code}/join`).set(lea.auth).expect(201);
    return { trip, code };
  }

  const upload = (tripId: string, headers: Record<string, string>, meta: object, file = PDF, name = 'billets.pdf') =>
    api().post(`/v1/trips/${tripId}/documents`).set(headers).field('meta', JSON.stringify(meta)).attach('file', file, name);
  const list = async (tripId: string, headers: Record<string, string>) =>
    (await api().get(`/v1/trips/${tripId}/documents`).set(headers).expect(200)).body as TripDocument[];

  it('keeps a private document to its owner, a direct link included (CDC §9, §15)', async () => {
    const { trip } = await newTrip();
    const ticket = (await upload(trip.id, lea.auth, { title: 'Carte d’embarquement', category: 'TRANSPORT', date: '2027-07-10' }).expect(201)).body as TripDocument;
    expect(ticket).toMatchObject({ kind: 'FILE', visibility: 'PRIVATE', mime: 'application/pdf', fileName: 'billets.pdf', sizeBytes: PDF.length, canEdit: true });

    expect(await list(trip.id, jordan.auth)).toEqual([]);
    await api().get(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(jordan.auth).expect(404);
    await api().get(`/v1/trips/${trip.id}/documents/${ticket.id}/url`).set(jordan.auth).expect(404);
    await api().delete(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(jordan.auth).expect(404);
    await api().get(`/v1/trips/${trip.id}/documents`).set(thomas.auth).expect(404);

    // Its owner opens it through a short link, which stops working once the document is gone.
    const { url, expiresAt } = (await api().get(`/v1/trips/${trip.id}/documents/${ticket.id}/url`).set(lea.auth).expect(200)).body as DocumentFileUrl;
    expect(new Date(expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000);
    const path = new URL(url).pathname + new URL(url).search;
    const file = await api().get(path).expect(200);
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(file.body as Buffer).equals(PDF)).toBe(true);
    await api().get(path.replace(/signature=[^&]+/, 'signature=forged')).expect(404);

    // Shared: everyone in the trip sees it; only its owner changes it, an organizer may remove it.
    const shared = (await api().patch(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(lea.auth).send({ visibility: 'SHARED', version: 1 }).expect(200)).body as TripDocument;
    expect(shared.version).toBe(2);
    expect((await list(trip.id, jordan.auth)).map((d) => [d.title, d.canEdit, d.canDelete])).toEqual([['Carte d’embarquement', false, true]]);
    await api().patch(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(jordan.auth).send({ title: 'Autre' }).expect(403);
    await api().patch(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(lea.auth).send({ title: 'Vieux', version: 1 }).expect(409);
    await api().delete(`/v1/trips/${trip.id}/documents/${ticket.id}`).set(jordan.auth).expect(204);
    await api().get(path).expect(404);
  });

  it('checks what a file really is, and its size', async () => {
    const { trip } = await newTrip();
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    const refused = await upload(trip.id, lea.auth, { title: 'Faux PDF' }, html, 'faux.pdf').expect(400);
    expect(refused.body.fields.file).toMatch(/PDF, JPEG et PNG/);
    await upload(trip.id, lea.auth, { title: 'Trop gros' }, Buffer.concat([PDF, Buffer.alloc(20 * 1024 * 1024)])).expect(413);
    await api().post(`/v1/trips/${trip.id}/documents`).set(lea.auth).field('meta', JSON.stringify({ title: 'Vide' })).expect(400);
    await upload(trip.id, lea.auth, {}).expect(400);
    // Named .pdf, but a PNG: kept as what it is.
    const photo = (await upload(trip.id, lea.auth, { title: 'Photo du passeport' }, PNG, 'passeport.pdf').expect(201)).body as TripDocument;
    expect(photo).toMatchObject({ mime: 'image/png', fileName: 'passeport.png' });
    // The name picked on the phone wins over the one of the copy it sends.
    const named = (await upload(trip.id, lea.auth, { title: 'Billet', fileName: 'Billet Alcázar.pdf' }, PDF, 'ABC123.pdf').expect(201)).body as TripDocument;
    expect(named.fileName).toBe('Billet Alcázar.pdf');
  });

  it('keeps links, dated by their planning item, the undated last', async () => {
    const { trip } = await newTrip();
    const event = (await api().post(`/v1/trips/${trip.id}/events`).set(jordan.auth).send({ title: 'Alcázar', startDate: '2027-07-12' }).expect(201)).body as TripEvent;
    await api().post(`/v1/trips/${trip.id}/documents/links`).set(jordan.auth).send({ title: 'Assurance', url: 'assurance.fr', visibility: 'SHARED' }).expect(201);
    const sixt = (
      await api().post(`/v1/trips/${trip.id}/documents/links`).set(jordan.auth).send({ title: 'Sixt', url: 'sixt.fr', bookingRef: 'SX-20391', date: '2027-07-10', visibility: 'SHARED' }).expect(201)
    ).body as TripDocument;
    expect(sixt).toMatchObject({ kind: 'LINK', url: 'https://sixt.fr', bookingRef: 'SX-20391' });
    await upload(trip.id, jordan.auth, { title: 'Billets Alcázar', eventId: event.id, category: 'ACTIVITY', visibility: 'SHARED' }).expect(201);
    await api().post(`/v1/trips/${trip.id}/documents/links`).set(jordan.auth).send({ title: 'Sans lien' }).expect(400);

    const docs = await list(trip.id, lea.auth);
    expect(docs.map((d) => [d.title, d.date])).toEqual([
      ['Sixt', '2027-07-10'],
      ['Billets Alcázar', '2027-07-12'],
      ['Assurance', null],
    ]);
    expect(docs[1]!.event).toEqual({ id: event.id, title: 'Alcázar', startDate: '2027-07-12' });

    // The item removed, the document stays, now without a date.
    await api().delete(`/v1/trips/${trip.id}/events/${event.id}`).set(jordan.auth).expect(204);
    expect((await list(trip.id, lea.auth)).find((d) => d.title === 'Billets Alcázar')).toMatchObject({ event: null, date: null });
  });

  it('removes the files with the trip, and moves a guest’s documents to their account', async () => {
    const { trip, code } = await newTrip();
    const { token } = (await api().post(`/v1/invitations/${code}/join-guest`).send({ displayName: 'Léa invitée' }).expect(201)).body as GuestJoinResponse;
    const guestDoc = (await upload(trip.id, { [GUEST_TOKEN_HEADER]: token }, { title: 'Billet invité' }).expect(201)).body as TripDocument;
    await api().post('/v1/me/guest-sessions/claim').set(lea.auth).send({ tokens: [token] }).expect(204);
    expect((await list(trip.id, lea.auth)).map((d) => d.id)).toEqual([guestDoc.id]);

    const { url } = (await api().get(`/v1/trips/${trip.id}/documents/${guestDoc.id}/url`).set(lea.auth).expect(200)).body as DocumentFileUrl;
    await api().delete(`/v1/trips/${trip.id}`).set(jordan.auth).expect(204);
    await api().get(new URL(url).pathname + new URL(url).search).expect(404);
  });
});
