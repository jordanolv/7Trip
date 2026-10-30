import { z } from 'zod';

import { splitEqually, type ExpenseShare } from './finance.js';
import type { ContentAuthor } from './ideas.js';
import { isoDateSchema } from './trips.js';

/** Kinds of expense, with the labels the apps show (CDC §8.1: the category is optional). */
export const EXPENSE_CATEGORIES = ['FOOD', 'ACTIVITY', 'TRANSPORT', 'LODGING', 'GROCERIES', 'SHOPPING', 'OTHER'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: 'Repas',
  ACTIVITY: 'Activités',
  TRANSPORT: 'Transport',
  LODGING: 'Hébergement',
  GROCERIES: 'Courses',
  SHOPPING: 'Souvenirs',
  OTHER: 'Autre',
};

/** 1 000 000,00 in minor units: more is a typing mistake. */
export const MAX_EXPENSE_MINOR = 100_000_000;

const amountMinorSchema = z.int('Montant invalide').positive('Le montant doit être positif').max(MAX_EXPENSE_MINOR, 'Montant trop élevé');

/**
 * How a shared expense is split. EQUAL: in equal parts between the people ticked (the leftover
 * cents go to the first ones, in the order of the trip). CUSTOM: an amount per person, adding up
 * to the total.
 */
export const expenseSplitSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('EQUAL'), participantIds: z.array(z.uuid()).min(1, 'Choisis au moins une personne') }),
  z.object({
    mode: z.literal('CUSTOM'),
    shares: z
      .array(z.object({ participantId: z.uuid(), amountMinor: z.int().min(0).max(MAX_EXPENSE_MINOR) }))
      .min(1, 'Choisis au moins une personne'),
  }),
]);
export type ExpenseSplit = z.input<typeof expenseSplitSchema>;

const expenseFields = z.object({
  label: z.string().trim().min(1, 'Donne un libellé à la dépense').max(80, '80 caractères maximum'),
  amountMinor: amountMinorSchema,
  date: isoDateSchema,
  category: z.enum(EXPENSE_CATEGORIES).nullish(),
  /** Personal: only its author sees it, it counts in their budget and never in the balances. */
  personal: z.boolean().default(false),
  /** Who advanced the money. A personal expense is always paid by its author. */
  payerId: z.uuid(),
  /** Ignored for a personal expense. */
  split: expenseSplitSchema.optional(),
});

function checkSplit(body: z.output<typeof expenseFields>, ctx: z.RefinementCtx) {
  if (body.personal) return;
  if (!body.split) {
    ctx.addIssue({ code: 'custom', path: ['split'], message: 'Choisis avec qui la partager' });
    return;
  }
  const ids = body.split.mode === 'EQUAL' ? body.split.participantIds : body.split.shares.map((s) => s.participantId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['split'], message: 'Chaque personne ne compte qu’une fois' });
  if (body.split.mode === 'CUSTOM') {
    const sum = body.split.shares.reduce((total, share) => total + share.amountMinor, 0);
    if (sum !== body.amountMinor) {
      ctx.addIssue({ code: 'custom', path: ['split'], message: `Les parts font ${formatMoney(sum)} au lieu de ${formatMoney(body.amountMinor)}` });
    }
  }
}

export const createExpenseRequestSchema = expenseFields.superRefine(checkSplit);
export type CreateExpenseRequest = z.input<typeof createExpenseRequestSchema>;

/** The whole expense again, plus the version the change was made on: a newer one means someone else edited it (409). */
export const updateExpenseRequestSchema = expenseFields.extend({ version: z.int().positive().optional() }).superRefine(checkSplit);
export type UpdateExpenseRequest = z.input<typeof updateExpenseRequestSchema>;

export const createSettlementRequestSchema = z
  .object({ fromId: z.uuid(), toId: z.uuid(), amountMinor: amountMinorSchema })
  .refine((body) => body.fromId !== body.toId, 'On ne se rembourse pas soi-même');
export type CreateSettlementRequest = z.input<typeof createSettlementRequestSchema>;

/** "Autre répartition": the plan the group picks among `TripBalances.plans`, for everyone. */
export const chooseTransferPlanRequestSchema = z.object({
  transfers: z.array(z.object({ fromId: z.uuid(), toId: z.uuid(), amountMinor: amountMinorSchema })).max(100),
});
export type ChooseTransferPlanRequest = z.input<typeof chooseTransferPlanRequestSchema>;

export interface ExpenseShareView {
  participant: ContentAuthor;
  amountMinor: number;
}

export interface Expense {
  id: string;
  tripId: string;
  label: string;
  amountMinor: number;
  /** The trip's currency (one currency per trip until multi-currency, step 6B). */
  currency: string;
  date: string;
  category: ExpenseCategory | null;
  personal: boolean;
  payer: ContentAuthor;
  author: ContentAuthor;
  splitMode: 'EQUAL' | 'CUSTOM';
  shares: ExpenseShareView[];
  /** What it costs the caller: their share, 0 when they are not in it. */
  myShareMinor: number;
  /** Author, payer or organizer (docs/decisions.md, "Permissions fines"). */
  canEdit: boolean;
  createdAt: string;
  /** Bumped on each change: sent back with an edit (docs/architecture.md, conflits). */
  version: number;
}

export interface Settlement {
  id: string;
  from: ContentAuthor;
  to: ContentAuthor;
  amountMinor: number;
  createdAt: string;
  /** The two people concerned, or an organizer, can cancel it. */
  canDelete: boolean;
}

export interface PersonBalance {
  participant: ContentAuthor;
  /** Advanced for the group (shared expenses only). */
  paidMinor: number;
  /** Their real shares of the shared expenses. */
  costMinor: number;
  /** paid − cost + repaid − received: positive, the group owes them. */
  balanceMinor: number;
}

export interface SuggestedTransfer {
  from: ContentAuthor;
  to: ContentAuthor;
  amountMinor: number;
}

export interface TripBalances {
  currency: string;
  /** Shared expenses only: personal ones are private. */
  groupTotalMinor: number;
  sharedCount: number;
  people: PersonBalance[];
  /** Who pays whom to be square: the plan the group chose while it still holds, else the suggestion. */
  transfers: SuggestedTransfer[];
  /** Every plan as short as `transfers`, in a stable order; `transfers` is plans[planIndex]. */
  plans: SuggestedTransfer[][];
  planIndex: number;
  settlements: Settlement[];
  me: {
    /** Advanced for the group. */
    paidMinor: number;
    /** Real cost: shares of shared expenses plus personal expenses. */
    costMinor: number;
    balanceMinor: number;
  };
}

/**
 * Parses an amount as typed: "48", "48,5", "1 284,00", "12.30". Null when it is not an amount
 * with at most two decimals.
 */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[\s  €]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const [units, cents = ''] = clean.split('.');
  return Number(units) * 100 + Number(cents.padEnd(2, '0'));
}

/** "1 284,00 €" (narrow no-break spaces between thousands). `whole` drops ",00" on round amounts. */
export function formatMoney(minor: number, currency = 'EUR', { whole = false }: { whole?: boolean } = {}): string {
  const sign = minor < 0 ? '− ' : '';
  const abs = Math.abs(minor);
  const units = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const cents = (abs % 100).toString().padStart(2, '0');
  const amount = whole && cents === '00' ? units : `${units},${cents}`;
  return `${sign}${amount} ${currency === 'EUR' ? '€' : currency}`;
}

/** Text for an amount field: 4800 → "48,00". */
export const amountInputText = (minor: number) => (minor / 100).toFixed(2).replace('.', ',');

/**
 * The real shares of an expense. A personal one is all for its payer. An equal split follows the
 * order the participants joined the trip (`joinOrder`), so the leftover cents always go to the same
 * people (docs/decisions.md, "Arrondis").
 */
export function expenseShares(
  expense: { amountMinor: number; personal: boolean; payerId: string; split?: ExpenseSplit },
  joinOrder: readonly string[],
): ExpenseShare[] {
  if (expense.personal || !expense.split) return [{ participantId: expense.payerId, amountMinor: expense.amountMinor }];
  if (expense.split.mode === 'CUSTOM') return expense.split.shares.filter((share) => share.amountMinor > 0);
  const picked = new Set(expense.split.participantIds);
  const ordered = [...joinOrder.filter((id) => picked.has(id)), ...expense.split.participantIds.filter((id) => !joinOrder.includes(id))];
  return splitEqually(expense.amountMinor, ordered);
}
