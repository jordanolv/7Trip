import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  MAX_DOCUMENT_BYTES,
  TRIP_DOCUMENTS_QUOTA_BYTES,
  sniffDocumentMime,
  type ApiErrorBody,
  type DocumentCategory,
  type DocumentFileUrl,
  type TripDocument,
  type createFileDocumentSchema,
  type createLinkDocumentSchema,
  type updateDocumentSchema,
} from '@7trip/shared';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import { toContentAuthor } from '../common/content-author.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { TripsService } from '../trips/trips.service.js';
import { StorageService } from './storage.service.js';

/** Validated request bodies. */
export type FileDocumentInput = z.output<typeof createFileDocumentSchema>;
export type LinkDocumentInput = z.output<typeof createLinkDocumentSchema>;
export type UpdateDocumentInput = z.output<typeof updateDocumentSchema>;

/** A file as received (multer, in memory). */
export interface UploadedDocumentFile {
  buffer: Buffer;
  size: number;
  originalname: string;
}

const DOCUMENT_INCLUDE = {
  owner: true,
  event: { select: { id: true, title: true, startDate: true } },
} satisfies Prisma.DocumentInclude;
type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof DOCUMENT_INCLUDE }>;

const documentNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Document introuvable');
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Private: its owner only, everywhere, a direct link included (CDC §9). Someone else's private
 * document is answered "not found", like one that does not exist.
 */
const visibleTo = (me: Participant): Prisma.DocumentWhereInput => ({ OR: [{ visibility: 'SHARED' }, { ownerId: me.id }] });

/** Its owner changes it; an organizer may also remove a shared one (moderation). */
const canEdit = (me: Participant, doc: { ownerId: string }) => doc.ownerId === me.id;
const canDelete = (me: Participant, doc: { ownerId: string; visibility: string }) =>
  canEdit(me, doc) || (doc.visibility === 'SHARED' && me.role === ParticipantRole.ORGANIZER);

/** Tickets, bookings and useful links of a trip (CDC §9). Files are in StorageService. */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly storage: StorageService,
  ) {}

  /** In date order (its own, else its planning item's), "Sans date" last. */
  async list(actor: Actor, tripId: string): Promise<TripDocument[]> {
    const me = await this.trips.member(actor, tripId);
    const documents = await this.prisma.document.findMany({ where: { tripId, ...visibleTo(me) }, include: DOCUMENT_INCLUDE, orderBy: { createdAt: 'asc' } });
    return documents
      .map((doc) => toDocument(doc, me))
      .sort((a, b) => (a.date === b.date ? 0 : a.date === null ? 1 : b.date === null ? -1 : a.date < b.date ? -1 : 1));
  }

  async get(actor: Actor, tripId: string, documentId: string): Promise<TripDocument> {
    const me = await this.trips.member(actor, tripId);
    return toDocument(await this.find(this.prisma, tripId, documentId, me), me);
  }

  /**
   * Stored first, then recorded: a failed upload leaves no row. Its type is read from its bytes,
   * not taken from the name or the header.
   */
  async createFile(actor: Actor, tripId: string, input: FileDocumentInput, file: UploadedDocumentFile | undefined): Promise<TripDocument> {
    if (!file?.size) throw validationError('file', 'Choisis un fichier');
    if (file.size > MAX_DOCUMENT_BYTES) throw validationError('file', '20 Mo maximum par fichier');
    const mime = sniffDocumentMime(file.buffer.subarray(0, 16));
    if (!mime) throw validationError('file', 'Seuls les PDF, JPEG et PNG sont acceptés');

    const me = await this.trips.member(actor, tripId);
    const id = randomUUID();
    const storageKey = StorageService.key(tripId, id);
    await this.checkQuota(this.prisma, tripId, file.size);
    await this.storage.put(storageKey, file.buffer, mime);
    try {
      return await this.trips.withTripLock(actor, tripId, async (tx) => {
        // Checked again under the lock: two uploads at once cannot both pass the quota.
        await this.checkQuota(tx, tripId, file.size);
        await this.checkEvent(tx, tripId, input.eventId);
        const doc = await tx.document.create({
          data: {
            id,
            tripId,
            ownerId: me.id,
            kind: 'FILE',
            ...this.fields(input),
            storageKey,
            mime,
            sizeBytes: file.size,
            fileName: cleanFileName(input.fileName || file.originalname, mime),
          },
          include: DOCUMENT_INCLUDE,
        });
        return toDocument(doc, me);
      });
    } catch (error) {
      await this.storage.remove([storageKey]);
      throw error;
    }
  }

  async createLink(actor: Actor, tripId: string, input: LinkDocumentInput): Promise<TripDocument> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      await this.checkEvent(tx, tripId, input.eventId);
      const doc = await tx.document.create({
        data: { tripId, ownerId: me.id, kind: 'LINK', ...this.fields(input), url: input.url },
        include: DOCUMENT_INCLUDE,
      });
      return toDocument(doc, me);
    });
  }

  async update(actor: Actor, tripId: string, documentId: string, input: UpdateDocumentInput): Promise<TripDocument> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const current = await this.find(tx, tripId, documentId, me);
      if (!canEdit(me, current)) throw forbidden();
      if (input.version !== undefined && input.version !== current.version) {
        throw apiError(HttpStatus.CONFLICT, ApiErrorCode.EditConflict, 'Ce document a été modifié entre-temps. Recharge-le avant de le modifier.');
      }
      if (input.eventId) await this.checkEvent(tx, tripId, input.eventId);
      if (current.kind === 'LINK' && input.url === null) throw validationError('url', 'Colle le lien');
      const doc = await tx.document.update({
        where: { id: current.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.date !== undefined && { date: input.date ? toDate(input.date) : null }),
          ...(input.eventId !== undefined && { eventId: input.eventId }),
          ...(input.visibility !== undefined && { visibility: input.visibility }),
          ...(input.bookingRef !== undefined && { bookingRef: input.bookingRef }),
          ...(current.kind === 'LINK' && input.url && { url: input.url }),
          version: { increment: 1 },
        },
        include: DOCUMENT_INCLUDE,
      });
      return toDocument(doc, me);
    });
  }

  async remove(actor: Actor, tripId: string, documentId: string): Promise<void> {
    const key = await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const doc = await this.find(tx, tripId, documentId, me);
      if (!canDelete(me, doc)) throw forbidden();
      await tx.document.delete({ where: { id: doc.id } });
      return doc.storageKey;
    });
    if (key) await this.storage.remove([key]);
  }

  /** A link to the file for a few minutes, after the same check as everywhere else. */
  async fileUrl(actor: Actor, tripId: string, documentId: string, apiBase: string): Promise<DocumentFileUrl> {
    const me = await this.trips.member(actor, tripId);
    const doc = await this.find(this.prisma, tripId, documentId, me);
    if (!doc.storageKey || !doc.mime) throw apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Ce document est un lien, sans fichier');
    const { url, expiresAt } = this.storage.signedUrl(doc.storageKey, apiBase);
    return { url, expiresAt: expiresAt.toISOString() };
  }

  private fields(input: FileDocumentInput) {
    return {
      title: input.title,
      category: input.category,
      date: input.date ? toDate(input.date) : null,
      eventId: input.eventId ?? null,
      visibility: input.visibility,
      bookingRef: input.bookingRef ?? null,
    };
  }

  private async checkQuota(db: Prisma.TransactionClient, tripId: string, size: number): Promise<void> {
    const { _sum } = await db.document.aggregate({ where: { tripId }, _sum: { sizeBytes: true } });
    if ((_sum.sizeBytes ?? 0) + size > TRIP_DOCUMENTS_QUOTA_BYTES) {
      throw validationError('file', 'Le voyage a atteint ses 500 Mo de documents : supprimes-en avant d’en ajouter.');
    }
  }

  private async checkEvent(tx: Prisma.TransactionClient, tripId: string, eventId: string | null | undefined): Promise<void> {
    if (eventId && !(await tx.event.count({ where: { id: eventId, tripId } }))) throw validationError('eventId', 'Cet événement n’est plus au planning');
  }

  private async find(db: Prisma.TransactionClient, tripId: string, documentId: string, me: Participant): Promise<DocumentWithRelations> {
    if (!z.uuid().safeParse(documentId).success) throw documentNotFound();
    const doc = await db.document.findFirst({ where: { id: documentId, tripId, ...visibleTo(me) }, include: DOCUMENT_INCLUDE });
    if (!doc) throw documentNotFound();
    return doc;
  }
}

/** The name as sent, without a path, with the extension of what it really is. */
function cleanFileName(name: string, mime: string): string {
  const base = (name.split(/[\\/]/).pop() ?? '').replace(/[\x00-\x1f]/g, '').trim().slice(0, 120) || 'document';
  const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
  return /\.[a-z0-9]{2,4}$/i.test(base) ? base.replace(/\.[a-z0-9]{2,4}$/i, `.${ext}`) : `${base}.${ext}`;
}

const forbidden = () => apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seul son propriétaire peut modifier ce document');

function validationError(field: string, message: string) {
  const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message, fields: { [field]: message } };
  return new BadRequestException(body);
}

function toDocument(doc: DocumentWithRelations, me: Participant): TripDocument {
  const ownDate = doc.date ? toIso(doc.date) : null;
  return {
    id: doc.id,
    tripId: doc.tripId,
    title: doc.title,
    kind: doc.kind,
    category: doc.category as DocumentCategory,
    date: ownDate ?? (doc.event ? toIso(doc.event.startDate) : null),
    ownDate,
    event: doc.event && { id: doc.event.id, title: doc.event.title, startDate: toIso(doc.event.startDate) },
    visibility: doc.visibility,
    bookingRef: doc.bookingRef,
    url: doc.url,
    mime: doc.mime,
    sizeBytes: doc.sizeBytes,
    fileName: doc.fileName,
    owner: toContentAuthor(doc.owner),
    canEdit: canEdit(me, doc),
    canDelete: canDelete(me, doc),
    createdAt: doc.createdAt.toISOString(),
    version: doc.version,
  };
}
