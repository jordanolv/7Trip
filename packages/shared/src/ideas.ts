import { z } from 'zod';

import type { ParticipantRole } from './trips.js';

/** Kinds of idea, with the labels the apps show (CDC §5: the category is optional). */
export const IDEA_CATEGORIES = ['ACTIVITY', 'FOOD', 'WALK', 'BEACH', 'CULTURE', 'NIGHTLIFE', 'OTHER'] as const;
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number];

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  ACTIVITY: 'Activité',
  FOOD: 'Restaurant',
  WALK: 'Balade',
  BEACH: 'Plage',
  CULTURE: 'Visite',
  NIGHTLIFE: 'Sortie',
  OTHER: 'Autre',
};

/**
 * Indicative only, no workflow (CDC §5). "Planned" is not a status: it is derived from the
 * event the idea is linked to (docs/architecture.md §4).
 */
export const IDEA_STATUSES = ['PROPOSED', 'KEPT'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = { PROPOSED: 'Proposée', KEPT: 'Retenue' };

const titleSchema = z.string().trim().min(1, 'Donne un titre à ton idée').max(80, '80 caractères maximum');

/** Optional text: blank means "none" (null). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((value) => value || null)
    .nullish();

/** A pasted link, with or without its scheme ("www.alcazarsevilla.org" works too). */
const optionalUrl = z
  .string()
  .trim()
  .max(500, 'Lien trop long')
  .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value || null))
  .pipe(z.url({ protocol: /^https?$/, hostname: z.regexes.domain, message: 'Lien invalide' }).nullable())
  .nullish();

const ideaFields = {
  category: z.enum(IDEA_CATEGORIES).nullish(),
  place: optionalText(120),
  url: optionalUrl,
  description: optionalText(1000),
  /** Free text, as people write it: "Gratuit", "~25 € / pers.". */
  cost: optionalText(40),
};

export const createIdeaRequestSchema = z.object({ title: titleSchema, ...ideaFields });
export type CreateIdeaRequest = z.input<typeof createIdeaRequestSchema>;

export const updateIdeaRequestSchema = z.object({
  title: titleSchema.optional(),
  ...ideaFields,
  status: z.enum(IDEA_STATUSES).optional(),
  /** The version the change was made on: a newer one on the server means someone else edited it meanwhile (409). */
  version: z.int().positive().optional(),
});
export type UpdateIdeaRequest = z.input<typeof updateIdeaRequestSchema>;

/** Marks the ideas up to `until` (the newest one shown) as seen, so later ones still count as new. */
export const markIdeasSeenRequestSchema = z.object({ until: z.iso.datetime() });
export type MarkIdeasSeenRequest = z.input<typeof markIdeasSeenRequestSchema>;

/** Ideas proposed by others since the participant last opened the idea box. */
export interface UnseenIdeas {
  count: number;
}

export interface ContentAuthor {
  id: string;
  displayName: string;
  /** Left or was removed: their content stays, shown as "Prénom (parti)". */
  hasLeft: boolean;
}

export interface Idea {
  id: string;
  title: string;
  category: IdeaCategory | null;
  place: string | null;
  url: string | null;
  description: string | null;
  cost: string | null;
  status: IdeaStatus;
  author: ContentAuthor;
  createdAt: string;
  version: number;
  /** Whether the caller may edit or delete it (canEditContent). */
  canEdit: boolean;
}

/** Organizers edit everything; everyone else, guests included, only what they added (docs/decisions.md). */
export function canEditContent(me: { id: string; role: ParticipantRole }, authorId: string): boolean {
  return me.role === 'ORGANIZER' || me.id === authorId;
}

/** "Camille", or "Camille (parti)" once they left the trip. */
export const authorName = (author: ContentAuthor) => (author.hasLeft ? `${author.displayName} (parti)` : author.displayName);

/** A Google Maps link (short maps.app.goo.gl or full google.com/maps): it already is the idea's location. */
export function isMapsUrl(url: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[a-z.]+\/|(www\.)?google\.[a-z.]+\/maps)/i.test(url);
}

/** Where "Voir sur Google Maps" leads: the idea's own Maps link, otherwise a search for its place. */
export function ideaMapsUrl(idea: Pick<Idea, 'place' | 'url'>): string | null {
  if (idea.url && isMapsUrl(idea.url)) return idea.url;
  return idea.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(idea.place)}` : null;
}
