import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  MAX_EXPENSE_MINOR,
  computeBalances,
  convertShares,
  currencyLabel,
  expenseShares,
  isBestTransferPlan,
  toBaseMinor,
  transferPlans,
  type ApiErrorBody,
  type ContentAuthor,
  type Expense,
  type ExpenseCategory,
  type SuggestedTransfer,
  type Settlement,
  type TripBalances,
  type createExpenseRequestSchema,
  type chooseTransferPlanRequestSchema,
  type createSettlementRequestSchema,
  type updateExpenseRequestSchema,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import { toContentAuthor } from '../common/content-author.js';
import { Prisma, type Participant } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { TripsService } from '../trips/trips.service.js';
import { RatesService, type DailyRate } from './rates.service.js';

/** Validated request bodies. */
export type ExpenseInput = z.output<typeof createExpenseRequestSchema>;
export type UpdateExpenseInput = z.output<typeof updateExpenseRequestSchema>;
export type SettlementInput = z.output<typeof createSettlementRequestSchema>;
export type TransferPlanInput = z.output<typeof chooseTransferPlanRequestSchema>;

const EXPENSE_INCLUDE = {
  author: true,
  payer: true,
  shares: { include: { participant: true } },
} satisfies Prisma.ExpenseInclude;
type ExpenseWithRelations = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

const SETTLEMENT_INCLUDE = { from: true, to: true } satisfies Prisma.SettlementInclude;
type SettlementWithRelations = Prisma.SettlementGetPayload<{ include: typeof SETTLEMENT_INCLUDE }>;

const expenseNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Dépense introuvable');

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Visible to the caller: every shared expense, and their own personal ones (docs/decisions.md). */
const visibleTo = (me: Participant): Prisma.ExpenseWhereInput => ({ OR: [{ personal: false }, { authorId: me.id }] });

/**
 * Its author, its payer, or an organizer may change a shared expense; a personal one is only ever
 * seen, so only changed, by its author (docs/decisions.md, "Permissions fines").
 */
function canEditExpense(me: Participant, expense: { authorId: string; payerId: string; personal: boolean }): boolean {
  if (expense.personal) return expense.authorId === me.id;
  return me.role === ParticipantRole.ORGANIZER || expense.authorId === me.id || expense.payerId === me.id;
}

/**
 * Expenses, balances and reimbursements (CDC §8). Amounts are integer cents in the trip's
 * currency; the maths is in @7trip/shared (finance.ts) and unit-tested there. Writes run under the
 * trip lock, like the rest of the trip's content.
 */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly rates: RatesService,
  ) {}

  /** Today's rate to fill in an expense in `currency`; null when it must be typed. */
  async rate(actor: Actor, tripId: string, currency: string): Promise<{ currency: string; baseCurrency: string; rate: DailyRate | null }> {
    await this.trips.member(actor, tripId);
    const trip = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId }, select: { baseCurrency: true } });
    return { currency, baseCurrency: trip.baseCurrency, rate: await this.rates.rate(currency, trip.baseCurrency) };
  }

  /** Newest first, by date then by entry. */
  async list(actor: Actor, tripId: string): Promise<Expense[]> {
    const me = await this.trips.member(actor, tripId);
    const expenses = await this.prisma.expense.findMany({
      where: { tripId, ...visibleTo(me) },
      include: EXPENSE_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return expenses.map((expense) => toExpense(expense, me));
  }

  async get(actor: Actor, tripId: string, expenseId: string): Promise<Expense> {
    const me = await this.trips.member(actor, tripId);
    return toExpense(await this.find(this.prisma, tripId, expenseId, me), me);
  }

  async create(actor: Actor, tripId: string, input: ExpenseInput): Promise<Expense> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { baseCurrency: true } });
      const money = await this.money(input, trip.baseCurrency, null);
      const shares = await this.resolveShares(tx, tripId, me, input, new Set(), money);
      const expense = await tx.expense.create({
        data: {
          tripId,
          authorId: me.id,
          ...this.fields(me, input),
          ...money,
          shares: { create: shares },
        },
        include: EXPENSE_INCLUDE,
      });
      return toExpense(expense, me);
    });
  }

  /** The whole expense is sent again; its shares are recomputed. */
  async update(actor: Actor, tripId: string, expenseId: string, input: UpdateExpenseInput): Promise<Expense> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const current = await this.find(tx, tripId, expenseId, me);
      if (!canEditExpense(me, current)) throw forbidden();
      // Writes of a trip are serialised by the lock: comparing here is enough.
      if (input.version !== undefined && input.version !== current.version) {
        throw apiError(HttpStatus.CONFLICT, ApiErrorCode.EditConflict, 'Quelqu’un a modifié cette dépense entre-temps. Recharge-la avant de la modifier.');
      }
      // Making it personal (or shared again) is only for its author: it changes who sees it.
      if (input.personal !== current.personal && current.authorId !== me.id) throw forbidden();
      // People who have left since may stay on it, but nobody who left can be added.
      const already = new Set([current.payerId, ...current.shares.map((s) => s.participantId)]);
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { baseCurrency: true } });
      const money = await this.money(input, trip.baseCurrency, current);
      let shares = await this.resolveShares(tx, tripId, me, input, already, money);
      // Same money (amount, currency, rate, shares as typed): the stored conversion stays. Converting
      // again could move a hundredth, e.g. on shares added up by a guest merge.
      const sameShares =
        shares.length === current.shares.length &&
        shares.every((s) => current.shares.some((c) => c.participantId === s.participantId && c.originalMinor === s.originalMinor));
      if (sameShares && money.currency === current.currency && money.rateToBase === Number(current.rateToBase) && input.amountMinor === current.amountMinor) {
        shares = current.shares.map(({ participantId, amountMinor, originalMinor }) => ({ participantId, amountMinor, originalMinor }));
      }
      await tx.expenseShare.deleteMany({ where: { expenseId } });
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: { ...this.fields(me, input), ...money, version: { increment: 1 }, shares: { create: shares } },
        include: EXPENSE_INCLUDE,
      });
      return toExpense(expense, me);
    });
  }

  async remove(actor: Actor, tripId: string, expenseId: string): Promise<void> {
    await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const expense = await this.find(tx, tripId, expenseId, me);
      if (!canEditExpense(me, expense)) throw forbidden();
      await tx.expense.delete({ where: { id: expense.id } });
    });
  }

  /** Who owes whom, from the shared expenses and the reimbursements marked as done (CDC §8.2). */
  async balances(actor: Actor, tripId: string): Promise<TripBalances> {
    const me = await this.trips.member(actor, tripId);
    // One after the other: the pool connection is shared with the rest of the request.
    const trip = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId }, select: { baseCurrency: true, transferPlan: true } });
    const participants = await this.prisma.participant.findMany({ where: { tripId }, orderBy: { joinedAt: 'asc' } });
    const expenses = await this.prisma.expense.findMany({ where: { tripId, ...visibleTo(me) }, include: { shares: true } });
    const settlements = await this.prisma.settlement.findMany({
      where: { tripId },
      include: SETTLEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const shared = expenses.filter((e) => !e.personal);
    const forBalance = shared.map((e) => ({ payerId: e.payerId, amountMinor: e.baseAmountMinor, shares: e.shares }));
    const balances = computeBalances(forBalance, settlements);
    const byId = new Map(participants.map((p) => [p.id, p]));
    const author = (id: string): ContentAuthor => toContentAuthor(byId.get(id)!);
    const paid = (id: string) => shared.filter((e) => e.payerId === id).reduce((sum, e) => sum + e.baseAmountMinor, 0);
    const cost = (id: string) => shared.reduce((sum, e) => sum + (e.shares.find((s) => s.participantId === id)?.amountMinor ?? 0), 0);

    // Active people always; those who left only while they still count in the accounts.
    const people = participants
      .filter((p) => p.status === ParticipantStatus.ACTIVE || paid(p.id) || cost(p.id) || balances.get(p.id))
      .map((p) => ({ participant: toContentAuthor(p), paidMinor: paid(p.id), costMinor: cost(p.id), balanceMinor: balances.get(p.id) ?? 0 }));
    const { plans, planIndex } = currentPlans(balances, storedPlan(trip.transferPlan));
    const toView = (plan: Transfer[]): SuggestedTransfer[] =>
      plan.map((t) => ({ from: author(t.fromId), to: author(t.toId), amountMinor: t.amountMinor }));
    const personal = expenses.filter((e) => e.personal && e.authorId === me.id).reduce((sum, e) => sum + e.baseAmountMinor, 0);

    return {
      currency: trip.baseCurrency,
      groupTotalMinor: shared.reduce((sum, e) => sum + e.baseAmountMinor, 0),
      sharedCount: shared.length,
      people,
      transfers: toView(plans[planIndex]!),
      plans: plans.map(toView),
      planIndex,
      settlements: settlements.map((s) => toSettlement(s, me)),
      me: { paidMinor: paid(me.id), costMinor: cost(me.id) + personal, balanceMinor: balances.get(me.id) ?? 0 },
    };
  }

  /** "C'est réglé": one of the two people concerned, or an organizer, records the reimbursement. */
  async settle(actor: Actor, tripId: string, input: SettlementInput): Promise<Settlement> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      if (me.role !== ParticipantRole.ORGANIZER && me.id !== input.fromId && me.id !== input.toId) {
        throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seules les deux personnes concernées et les organisateurs peuvent marquer ce remboursement');
      }
      const found = await tx.participant.count({ where: { tripId, id: { in: [input.fromId, input.toId] } } });
      if (found !== 2) throw validationError('toId', 'Participant inconnu');
      // Checked again under the lock: the same reimbursement confirmed twice (both people, two
      // devices) must not be counted twice. `from` must still owe it, and `to` still be owed it.
      const balances = await this.currentBalances(tx, tripId);
      if ((balances.get(input.fromId) ?? 0) > -input.amountMinor || (balances.get(input.toId) ?? 0) < input.amountMinor) {
        throw apiError(HttpStatus.CONFLICT, ApiErrorCode.EditConflict, 'Les soldes ont changé entre-temps : ce remboursement est peut-être déjà enregistré.');
      }
      const settlement = await tx.settlement.create({
        data: { tripId, fromId: input.fromId, toId: input.toId, amountMinor: input.amountMinor, createdById: me.id },
        include: SETTLEMENT_INCLUDE,
      });
      // One transfer of the chosen plan done: the rest of it still squares everyone in the fewest
      // transfers, so it stays the plan shown.
      const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { transferPlan: true } });
      const plan = storedPlan(trip.transferPlan);
      const done = plan?.findIndex((t) => t.fromId === input.fromId && t.toId === input.toId && t.amountMinor === input.amountMinor) ?? -1;
      if (plan && done >= 0) {
        plan.splice(done, 1);
        await tx.trip.update({ where: { id: tripId }, data: { transferPlan: plan.length ? plan : Prisma.DbNull } });
      }
      return toSettlement(settlement, me);
    });
  }

  /**
   * "Autre répartition": any member picks, for the whole group, another plan as short as the
   * suggestion. Refused (409) once the balances have moved and it no longer squares everyone.
   */
  async choosePlan(actor: Actor, tripId: string, input: TransferPlanInput): Promise<TripBalances> {
    await this.trips.withTripLock(actor, tripId, async (tx) => {
      if (!isBestTransferPlan(await this.currentBalances(tx, tripId), input.transfers)) {
        throw apiError(HttpStatus.CONFLICT, ApiErrorCode.EditConflict, 'Les soldes ont changé entre-temps : choisis à nouveau une répartition.');
      }
      await tx.trip.update({ where: { id: tripId }, data: { transferPlan: input.transfers } });
    });
    return this.balances(actor, tripId);
  }

  /** Cancels a reimbursement marked by mistake. */
  async unsettle(actor: Actor, tripId: string, settlementId: string): Promise<void> {
    await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const notFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Remboursement introuvable');
      if (!z.uuid().safeParse(settlementId).success) throw notFound();
      const settlement = await tx.settlement.findFirst({ where: { id: settlementId, tripId } });
      if (!settlement) throw notFound();
      if (!canDeleteSettlement(me, settlement)) throw forbidden();
      await tx.settlement.delete({ where: { id: settlement.id } });
    });
  }

  /** Balances from the shared expenses and the reimbursements, read inside the transaction. */
  private async currentBalances(tx: Prisma.TransactionClient, tripId: string): Promise<Map<string, number>> {
    const expenses = await tx.expense.findMany({ where: { tripId, personal: false }, include: { shares: true } });
    const settlements = await tx.settlement.findMany({ where: { tripId } });
    return computeBalances(
      expenses.map((e) => ({ payerId: e.payerId, amountMinor: e.baseAmountMinor, shares: e.shares })),
      settlements,
    );
  }

  /**
   * Currency, frozen rate and amount in the trip's currency. In the trip's currency the rate is 1.
   * Otherwise: the rate sent; on an edit in the same currency, the one already frozen; else today's
   * ECB rate. Without any of them, the rate must be typed.
   */
  private async money(input: ExpenseInput, baseCurrency: string, current: { currency: string; rateToBase: Prisma.Decimal } | null) {
    const currency = input.currency ?? (current ? current.currency : baseCurrency);
    let rateToBase = 1;
    if (currency !== baseCurrency) {
      const frozen = current?.currency === currency ? Number(current.rateToBase) : undefined;
      const rate = input.rateToBase ?? frozen ?? (await this.rates.rate(currency, baseCurrency))?.rate;
      if (rate === undefined) throw validationError('rateToBase', `Indique le taux du ${currencyLabel(currency).toLowerCase()}`);
      rateToBase = rate;
    }
    const baseAmountMinor = toBaseMinor(input.amountMinor, rateToBase);
    if (baseAmountMinor < 1) throw validationError('amountMinor', 'Montant trop faible une fois converti');
    if (baseAmountMinor > MAX_EXPENSE_MINOR) throw validationError('amountMinor', 'Montant trop élevé une fois converti');
    return { currency, rateToBase, baseAmountMinor };
  }

  private fields(me: Participant, input: ExpenseInput) {
    return {
      label: input.label,
      amountMinor: input.amountMinor,
      date: toDate(input.date),
      category: input.category ?? null,
      personal: input.personal,
      payerId: input.personal ? me.id : input.payerId,
      splitMode: !input.personal && input.split?.mode === 'CUSTOM' ? ('CUSTOM' as const) : ('EQUAL' as const),
    };
  }

  /**
   * The real shares, after checking everyone named is in the trip. Active participants only,
   * except `already` (on an edit: the people already on the expense, who may have left since).
   */
  private async resolveShares(
    tx: Prisma.TransactionClient,
    tripId: string,
    me: Participant,
    input: ExpenseInput,
    already: Set<string>,
    money: { rateToBase: number; baseAmountMinor: number },
  ): Promise<{ participantId: string; amountMinor: number; originalMinor: number }[]> {
    if (input.personal && input.payerId !== me.id) throw validationError('payerId', 'Une dépense personnelle est payée par toi');
    const participants = await tx.participant.findMany({ where: { tripId }, orderBy: { joinedAt: 'asc' } });
    const allowed = new Set(participants.filter((p) => p.status === ParticipantStatus.ACTIVE || already.has(p.id)).map((p) => p.id));
    const shares = expenseShares(input, participants.map((p) => p.id));
    if (!allowed.has(input.payerId)) throw validationError('payerId', 'Cette personne ne fait pas partie du voyage');
    if (!shares.every((s) => allowed.has(s.participantId))) throw validationError('split', 'Une des personnes ne fait pas partie du voyage');
    // Split in the expense's currency, stored in the trip's: the converted shares add up exactly.
    return convertShares(shares, money.rateToBase, money.baseAmountMinor).map((s) => ({
      participantId: s.participantId,
      amountMinor: s.baseMinor,
      originalMinor: s.amountMinor,
    }));
  }

  private async find(db: Prisma.TransactionClient, tripId: string, expenseId: string, me: Participant): Promise<ExpenseWithRelations> {
    if (!z.uuid().safeParse(expenseId).success) throw expenseNotFound();
    const expense = await db.expense.findFirst({ where: { id: expenseId, tripId, ...visibleTo(me) }, include: EXPENSE_INCLUDE });
    if (!expense) throw expenseNotFound();
    return expense;
  }
}

type Transfer = { fromId: string; toId: string; amountMinor: number };

/** The plan saved on the trip, or null when there is none or it is not one. */
function storedPlan(value: Prisma.JsonValue): Transfer[] | null {
  if (!Array.isArray(value)) return null;
  const plan = value.filter(
    (t): t is Transfer =>
      typeof t === 'object' && t !== null && !Array.isArray(t) && typeof t.fromId === 'string' && typeof t.toId === 'string' && typeof t.amountMinor === 'number',
  );
  return plan.length === value.length ? plan.map(({ fromId, toId, amountMinor }) => ({ fromId, toId, amountMinor })) : null;
}

const samePlan = (a: Transfer[], b: Transfer[]) => {
  const key = (plan: Transfer[]) => plan.map((t) => `${t.fromId}>${t.toId}:${t.amountMinor}`).sort().join('|');
  return key(a) === key(b);
};

/**
 * The plans to offer, and which one is shown: the chosen one while it still squares everyone in
 * the fewest transfers, else the suggestion (plans[0]).
 */
function currentPlans(balances: Map<string, number>, chosen: Transfer[] | null): { plans: Transfer[][]; planIndex: number } {
  const plans = transferPlans(balances);
  if (!chosen || !isBestTransferPlan(balances, chosen)) return { plans, planIndex: 0 };
  const index = plans.findIndex((plan) => samePlan(plan, chosen));
  return index >= 0 ? { plans, planIndex: index } : { plans: [...plans, chosen], planIndex: plans.length };
}

const canDeleteSettlement = (me: Participant, s: { fromId: string; toId: string }) =>
  me.role === ParticipantRole.ORGANIZER || me.id === s.fromId || me.id === s.toId;

const forbidden = () =>
  apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seuls son auteur, son payeur et les organisateurs peuvent modifier cette dépense');

function validationError(field: string, message: string) {
  const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message, fields: { [field]: message } };
  return new BadRequestException(body);
}

function toExpense(expense: ExpenseWithRelations, me: Participant): Expense {
  // In the order people joined the trip, like the split.
  const shares = expense.shares
    .map((s) => ({ participant: toContentAuthor(s.participant), amountMinor: s.amountMinor, originalMinor: s.originalMinor, joinedAt: s.participant.joinedAt }))
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
    .map(({ joinedAt: _joinedAt, ...share }) => share);
  return {
    id: expense.id,
    tripId: expense.tripId,
    label: expense.label,
    amountMinor: expense.amountMinor,
    currency: expense.currency,
    rateToBase: Number(expense.rateToBase),
    baseAmountMinor: expense.baseAmountMinor,
    date: expense.date.toISOString().slice(0, 10),
    category: expense.category as ExpenseCategory | null,
    personal: expense.personal,
    payer: toContentAuthor(expense.payer),
    author: toContentAuthor(expense.author),
    splitMode: expense.splitMode,
    shares,
    myShareMinor: expense.shares.find((s) => s.participantId === me.id)?.amountMinor ?? 0,
    canEdit: canEditExpense(me, expense),
    createdAt: expense.createdAt.toISOString(),
    version: expense.version,
  };
}

function toSettlement(settlement: SettlementWithRelations, me: Participant): Settlement {
  return {
    id: settlement.id,
    from: toContentAuthor(settlement.from),
    to: toContentAuthor(settlement.to),
    amountMinor: settlement.amountMinor,
    createdAt: settlement.createdAt.toISOString(),
    canDelete: canDeleteSettlement(me, settlement),
  };
}
