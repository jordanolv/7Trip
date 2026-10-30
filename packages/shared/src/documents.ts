import { z } from 'zod';

import { optionalText, optionalUrl } from './fields.js';
import type { ContentAuthor } from './ideas.js';
import { isoDateSchema } from './trips.js';

/** The filters of the Documents screen (CDC §9), with the labels the apps show. */
export const DOCUMENT_CATEGORIES = ['TRANSPORT', 'LODGING', 'ACTIVITY', 'OTHER'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  TRANSPORT: 'Transport',
  LODGING: 'Hébergement',
  ACTIVITY: 'Activité',
  OTHER: 'Autre',
};

/** docs/decisions.md, "Documents": 20 Mo per file, 500 Mo per trip. */
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const TRIP_DOCUMENTS_QUOTA_BYTES = 500 * 1024 * 1024;

/** What a file may be. HEIC photos are turned into JPEG by the app before they are sent. */
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

/** Private by default (CDC §9): only its owner sees it, even through a direct link. */
export const documentVisibilitySchema = z.enum(['PRIVATE', 'SHARED']);
export type DocumentVisibility = z.infer<typeof documentVisibilitySchema>;

const documentFields = {
  title: z.string().trim().min(1, 'Donne un nom au document').max(120, '120 caractères maximum'),
  category: z.enum(DOCUMENT_CATEGORIES).default('OTHER'),
  /** Null: in "Sans date", unless its planning item gives it one. */
  date: isoDateSchema.nullish(),
  /** The planning item it belongs to: shown on it, without a copy (CDC §9). */
  eventId: z.uuid().nullish(),
  visibility: documentVisibilitySchema.default('PRIVATE'),
  /** "Réf. SX-20391". */
  bookingRef: optionalText(60),
};

/** Sent with the file (a multipart field `meta`, in JSON). */
export const createFileDocumentSchema = z.object(documentFields);
export type CreateFileDocumentRequest = z.input<typeof createFileDocumentSchema>;

export const createLinkDocumentSchema = z
  .object({ ...documentFields, url: optionalUrl })
  .refine((body) => !!body.url, { message: 'Colle le lien', path: ['url'] });
export type CreateLinkDocumentRequest = z.input<typeof createLinkDocumentSchema>;

/** Any field; the version it was made on, else a newer one means someone else edited it (409). */
export const updateDocumentSchema = z
  .object({
    title: documentFields.title,
    category: z.enum(DOCUMENT_CATEGORIES),
    date: documentFields.date,
    eventId: documentFields.eventId,
    visibility: documentVisibilitySchema,
    bookingRef: documentFields.bookingRef,
    url: optionalUrl,
    version: z.int().positive(),
  })
  .partial();
export type UpdateDocumentRequest = z.input<typeof updateDocumentSchema>;

export interface TripDocument {
  id: string;
  tripId: string;
  title: string;
  kind: 'FILE' | 'LINK';
  category: DocumentCategory;
  /** Its own date, else its planning item's; null: "Sans date". */
  date: string | null;
  /** Its own date as set (null when it only takes its item's). */
  ownDate: string | null;
  event: { id: string; title: string; startDate: string } | null;
  visibility: DocumentVisibility;
  bookingRef: string | null;
  /** A link: where it goes. */
  url: string | null;
  /** A file: its type, size and name as sent. */
  mime: string | null;
  sizeBytes: number | null;
  fileName: string | null;
  owner: ContentAuthor;
  /** Only its owner changes it; an organizer may also delete a shared one. */
  canEdit: boolean;
  canDelete: boolean;
  createdAt: string;
  version: number;
}

/** A file to open: a link valid a few minutes (docs/decisions.md, "Après révocation d'accès"). */
export interface DocumentFileUrl {
  url: string;
  expiresAt: string;
}

/** The type read from the first bytes, which must match what the file says it is; null: refused. */
export function sniffDocumentMime(head: Uint8Array): DocumentMimeType | null {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => head[i] === byte);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'application/pdf';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  return null;
}

/** "2,4 Mo", "820 Ko". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',').replace(/,0$/, '')} Mo`;
}
