import { z } from 'zod';

import { formatDateRange } from './format.js';
import type { ContentAuthor } from './ideas.js';
import { isoDateSchema } from './trips.js';

/** What a poll decides (CDC §6). The kind only shapes the options and the follow-up offered once closed. */
export const POLL_KINDS = ['DESTINATION', 'DATES', 'LODGING', 'FOOD', 'ACTIVITY', 'YES_NO', 'OTHER'] as const;
export type PollKind = (typeof POLL_KINDS)[number];

export const POLL_KIND_LABELS: Record<PollKind, string> = {
  DESTINATION: 'Destination',
  DATES: 'Dates',
  LODGING: 'Logement',
  FOOD: 'Restaurant',
  ACTIVITY: 'Activité',
  YES_NO: 'Oui / Non',
  OTHER: 'Autre',
};

/** Kinds whose options can come from the idea box: the follow-up keeps the winning idea. */
export const IDEA_POLL_KINDS: readonly PollKind[] = ['LODGING', 'FOOD', 'ACTIVITY'];

export const YES_NO_OPTIONS = ['Oui', 'Non', 'Peut-être'] as const;

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 10;

const questionSchema = z.string().trim().min(1, 'Pose ta question').max(120, '120 caractères maximum');
const labelSchema = z.string().trim().min(1, 'Option vide').max(80, '80 caractères maximum');

export const pollOptionInputSchema = z
  .object({
    label: labelSchema,
    /** Options of a DATES poll: the range they propose. */
    startDate: isoDateSchema.nullish(),
    endDate: isoDateSchema.nullish(),
    /** The idea the option stands for (LODGING, FOOD, ACTIVITY polls). */
    ideaId: z.uuid().nullish(),
  })
  .refine((o) => !o.startDate || !o.endDate || o.endDate >= o.startDate, {
    message: 'La date de fin doit être après la date de début',
    path: ['endDate'],
  });
export type PollOptionInput = z.input<typeof pollOptionInputSchema>;

export const createPollRequestSchema = z
  .object({
    kind: z.enum(POLL_KINDS).default('OTHER'),
    question: questionSchema,
    options: z
      .array(pollOptionInputSchema)
      .min(MIN_POLL_OPTIONS, `Au moins ${MIN_POLL_OPTIONS} options`)
      .max(MAX_POLL_OPTIONS, `${MAX_POLL_OPTIONS} options maximum`),
    /** Single choice unless chosen explicitly (CDC §6). */
    multiple: z.boolean().default(false),
    /** Optional deadline: the poll closes on its own then. */
    closesAt: z.iso.datetime({ offset: true, message: 'Date limite invalide' }).nullish(),
  })
  .superRefine((poll, ctx) => {
    const labels = poll.options.map((o) => o.label.trim().toLowerCase());
    labels.forEach((label, i) => {
      if (labels.indexOf(label) !== i) ctx.addIssue({ code: 'custom', path: ['options', i, 'label'], message: 'Cette option existe déjà' });
    });
    if (poll.kind === 'DATES') {
      poll.options.forEach((o, i) => {
        if (!o.startDate) ctx.addIssue({ code: 'custom', path: ['options', i, 'startDate'], message: 'Choisis les dates' });
      });
    }
  });
export type CreatePollRequest = z.input<typeof createPollRequestSchema>;

/** The caller's whole vote: an empty list withdraws it. */
export const votePollRequestSchema = z.object({ optionIds: z.array(z.uuid()).max(MAX_POLL_OPTIONS) });
export type VotePollRequest = z.input<typeof votePollRequestSchema>;

export const applyPollRequestSchema = z.object({ optionId: z.uuid() });
export type ApplyPollRequest = z.input<typeof applyPollRequestSchema>;

export interface PollOption {
  id: string;
  label: string;
  startDate: string | null;
  endDate: string | null;
  ideaId: string | null;
  /** Null while the results are hidden from the caller (they have not voted and the poll is open). */
  votes: number | null;
  voters: ContentAuthor[] | null;
  /** Part of the caller's vote. */
  mine: boolean;
}

export interface Poll {
  id: string;
  tripId: string;
  kind: PollKind;
  question: string;
  multiple: boolean;
  closesAt: string | null;
  /** Closed by an organizer, or past its deadline. */
  closed: boolean;
  closedAt: string | null;
  /** Null when it closed on its own at the deadline. */
  closedBy: ContentAuthor | null;
  author: ContentAuthor;
  createdAt: string;
  options: PollOption[];
  /** Who voted, out of the active participants: always visible, unlike what they voted. */
  voterCount: number;
  eligibleCount: number;
  /** Active participants who have not voted yet. */
  waiting: ContentAuthor[];
  hasVoted: boolean;
  resultsVisible: boolean;
  /** The option an organizer applied (destination set, idea kept…). */
  appliedOptionId: string | null;
  canClose: boolean;
  canDelete: boolean;
}

/** Results show once you voted, or to everyone once closed (docs/decisions.md). */
export const pollResultsVisible = (poll: { closed: boolean; hasVoted: boolean }) => poll.closed || poll.hasVoted;

/** A poll is closed once closed by hand or past its deadline. */
export function isPollClosed(poll: { closedAt: Date | string | null; closesAt: Date | string | null }, now = new Date()): boolean {
  return poll.closedAt !== null || (poll.closesAt !== null && new Date(poll.closesAt).getTime() <= now.getTime());
}

/** The options with the most votes; several on a tie, none before any vote. Nothing is decided from it (CDC §6). */
export function pollLeaders<T extends Pick<PollOption, 'votes'>>(options: readonly T[]): T[] {
  const top = Math.max(0, ...options.map((o) => o.votes ?? 0));
  return top === 0 ? [] : options.filter((o) => o.votes === top);
}

export type PollFollowUp = 'destination' | 'dates' | 'keepIdea';

/** What applying an option does, if anything: set the destination, set the dates, keep the idea. */
export function pollFollowUp(kind: PollKind, option: Pick<PollOption, 'startDate' | 'ideaId'>): PollFollowUp | null {
  if (kind === 'DESTINATION') return 'destination';
  if (kind === 'DATES' && option.startDate) return 'dates';
  if (IDEA_POLL_KINDS.includes(kind) && option.ideaId) return 'keepIdea';
  return null;
}

/** "Définir Split comme destination", "Fixer les dates : 12 – 19 juillet", "Retenir « Tapas »". */
export function pollFollowUpLabel(followUp: PollFollowUp, option: Pick<PollOption, 'label' | 'startDate' | 'endDate'>, today: string): string {
  switch (followUp) {
    case 'destination':
      return `Définir ${option.label} comme destination`;
    case 'dates':
      return `Fixer les dates : ${formatDateRange(option.startDate, option.endDate, today) ?? option.label}`;
    case 'keepIdea':
      return `Retenir « ${option.label} »`;
  }
}

/** Label of a DATES option, from its range. */
export const dateOptionLabel = (startDate: string, endDate: string | null, today: string) =>
  formatDateRange(startDate, endDate, today) ?? startDate;

/** "1 vote", "3 votes". */
export const votesLabel = (count: number) => (count > 1 ? `${count} votes` : `${count} vote`);
