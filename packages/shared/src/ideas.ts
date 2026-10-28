import { z } from 'zod';

import { optionalText, optionalUrl } from './fields.js';
import type { AvatarColor } from './avatars.js';
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
  avatarColor: AvatarColor;
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
  /** Its event once on the planning ("Planifiée" is derived from it, never stored). */
  plannedEvent: PlannedSlot | null;
}

/** When a planned idea happens. */
export interface PlannedSlot {
  id: string;
  startDate: string;
  startTime: string | null;
}

/** Organizers edit everything; everyone else, guests included, only what they added (docs/decisions.md). */
export function canEditContent(me: { id: string; role: ParticipantRole }, authorId: string): boolean {
  return me.role === 'ORGANIZER' || me.id === authorId;
}

/** "Camille", or "Camille (parti)" once they left the trip. */
export const authorName = (author: ContentAuthor) => (author.hasLeft ? `${author.displayName} (parti)` : author.displayName);

/** A Google Maps link (short maps.app.goo.gl or full google.com/maps): it already is the location. */
export function isMapsUrl(url: string): boolean {
  return /^https?:\/\/(maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[a-z.]+\/|(www\.)?google\.[a-z.]+\/maps)/i.test(url);
}

/** Where "Voir sur Google Maps" leads for an idea or an event: its own Maps link, otherwise a search for its place. */
export function placeMapsUrl(item: { place: string | null; url: string | null }): string | null {
  if (item.url && isMapsUrl(item.url)) return item.url;
  return item.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.place)}` : null;
}
