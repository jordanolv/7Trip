import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ApiErrorCode, FORMER_PARTICIPANT_NAME, type ApiErrorBody } from '@7trip/shared';
import { PasswordService } from '../auth/password.service.js';
import { apiError } from '../common/api-error.js';
import { StorageService } from '../documents/storage.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { DocumentVisibility, ParticipantRole, ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toMe } from './to-me.js';

/** An access token outlives a deleted account by a few minutes: the app then signs out. */
const accountGone = () => apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.Unauthorized, 'Ce compte n’existe plus');
const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

/**
 * The account's own data (RGPD): a JSON export, and deletion. Deleting keeps the trips coherent for
 * the others: the participant stays, renamed "Ancien participant", with what the group shares
 * (expenses, votes, ideas…); what only they could see goes (docs/architecture.md §11).
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly storage: StorageService,
  ) {}

  async export(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { pushTokens: { select: { timeZone: true, createdAt: true, updatedAt: true } } },
    });
    if (!user) throw accountGone();
    const participants = await this.prisma.participant.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      include: {
        trip: { include: { destinations: { orderBy: { position: 'asc' } } } },
        ideas: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { startDate: 'asc' } },
        polls: { include: { options: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'asc' } },
        votes: { include: { option: { include: { poll: { select: { question: true } } } } } },
        expenses: { orderBy: { date: 'asc' } },
        paidExpenses: { orderBy: { date: 'asc' } },
        expenseShares: { include: { expense: { select: { label: true, date: true, currency: true } } } },
        settlementsPaid: { include: { to: { select: { displayName: true } } } },
        settlementsGot: { include: { from: { select: { displayName: true } } } },
        budget: true,
        documents: { orderBy: { createdAt: 'asc' } },
      },
    });

    const expense = (e: (typeof participants)[number]['expenses'][number]) => ({
      label: e.label,
      amountMinor: e.amountMinor,
      currency: e.currency,
      date: day(e.date),
      category: e.category,
      personal: e.personal,
    });
    return {
      exportedAt: new Date().toISOString(),
      account: { ...toMe(user), updatedAt: user.updatedAt.toISOString() },
      devices: user.pushTokens.map((t) => ({ timeZone: t.timeZone, since: t.createdAt.toISOString(), lastSeen: t.updatedAt.toISOString() })),
      trips: participants.map((p) => ({
        trip: {
          title: p.trip.title,
          startDate: day(p.trip.startDate),
          endDate: day(p.trip.endDate),
          destinations: p.trip.destinations.map((d) => d.name),
          currency: p.trip.baseCurrency,
        },
        participation: {
          displayName: p.displayName,
          role: p.role,
          status: p.status,
          joinedAt: p.joinedAt.toISOString(),
          leftAt: p.leftAt?.toISOString() ?? null,
          notificationPreferences: p.notifPrefs,
        },
        ideas: p.ideas.map((i) => ({ title: i.title, category: i.category, place: i.place, url: i.url, description: i.description, cost: i.cost, createdAt: i.createdAt.toISOString() })),
        events: p.events.map((e) => ({
          title: e.title,
          category: e.category,
          startDate: day(e.startDate),
          endDate: day(e.endDate),
          startTime: e.startTime,
          endTime: e.endTime,
          place: e.place,
          url: e.url,
          description: e.description,
          bookingRef: e.bookingRef,
        })),
        polls: p.polls.map((poll) => ({ question: poll.question, options: poll.options.map((o) => o.label), createdAt: poll.createdAt.toISOString() })),
        votes: p.votes.map((v) => ({ poll: v.option.poll.question, option: v.option.label, at: v.createdAt.toISOString() })),
        expensesAdded: p.expenses.map(expense),
        expensesPaid: p.paidExpenses.map(expense),
        shares: p.expenseShares.map((s) => ({ expense: s.expense.label, date: day(s.expense.date), amountMinor: s.originalMinor, currency: s.expense.currency })),
        reimbursementsMade: p.settlementsPaid.map((s) => ({ to: s.to.displayName, amountMinor: s.amountMinor, currency: p.trip.baseCurrency, at: s.createdAt.toISOString() })),
        reimbursementsReceived: p.settlementsGot.map((s) => ({ from: s.from.displayName, amountMinor: s.amountMinor, currency: p.trip.baseCurrency, at: s.createdAt.toISOString() })),
        budget: p.budget && { currency: p.budget.currency, totalMinor: p.budget.totalMinor, perCategory: p.budget.perCategory },
        // Files themselves stay downloadable in the app; the export lists them.
        documents: p.documents.map((d) => ({
          title: d.title,
          kind: d.kind,
          category: d.category,
          date: day(d.date),
          visibility: d.visibility,
          bookingRef: d.bookingRef,
          url: d.url,
          fileName: d.fileName,
          sizeBytes: d.sizeBytes,
        })),
      })),
    };
  }

  /**
   * In each trip where the account is active: a trip with no other account in it goes (only
   * guests, or nobody, would be left); otherwise the oldest other account becomes organizer if
   * they were the last one. Then every participation of the account is anonymised.
   */
  async delete(userId: string, password: string | undefined): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw accountGone();
    if (user.passwordHash !== null && !(await this.passwords.verify(user.passwordHash, password ?? ''))) {
      // Not a 401: the app would take it for an expired session.
      const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message: 'Mot de passe incorrect', fields: { password: 'Mot de passe incorrect' } };
      throw new HttpException(body, HttpStatus.BAD_REQUEST);
    }

    const keys = await this.prisma.$transaction(async (tx) => {
      const keys: string[] = [];
      const active = await tx.participant.findMany({ where: { userId, status: ParticipantStatus.ACTIVE }, orderBy: { tripId: 'asc' } });
      for (const me of active) {
        // Same lock as every change of the trip (TripsService.withTripLock), taken in a fixed order.
        await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${me.tripId}::uuid FOR UPDATE`;
        const others = await tx.participant.findMany({
          where: { tripId: me.tripId, status: ParticipantStatus.ACTIVE, userId: { not: null }, NOT: { id: me.id } },
          orderBy: { joinedAt: 'asc' },
        });
        if (others.length === 0) {
          const files = await tx.document.findMany({ where: { tripId: me.tripId, storageKey: { not: null } }, select: { storageKey: true } });
          keys.push(...files.map((f) => f.storageKey!));
          await tx.trip.delete({ where: { id: me.tripId } });
        } else if (me.role === ParticipantRole.ORGANIZER && !others.some((o) => o.role === ParticipantRole.ORGANIZER)) {
          await tx.participant.update({ where: { id: others[0]!.id }, data: { role: ParticipantRole.ORGANIZER } });
        }
      }

      const mine = { participant: { userId } };
      const privateFiles = await tx.document.findMany({
        where: { owner: { userId }, visibility: DocumentVisibility.PRIVATE, storageKey: { not: null } },
        select: { storageKey: true },
      });
      keys.push(...privateFiles.map((f) => f.storageKey!));
      await tx.document.deleteMany({ where: { owner: { userId }, visibility: DocumentVisibility.PRIVATE } });
      await tx.expense.deleteMany({ where: { author: { userId }, personal: true } });
      await tx.personalBudget.deleteMany({ where: mine });
      await tx.notification.deleteMany({ where: { ...mine, sentAt: null } });

      const anonymous = { displayName: FORMER_PARTICIPANT_NAME, avatarColor: null, notifPrefs: Prisma.DbNull, ideasSeenAt: null };
      await tx.participant.updateMany({
        where: { userId, status: ParticipantStatus.ACTIVE },
        data: { ...anonymous, role: ParticipantRole.PARTICIPANT, status: ParticipantStatus.LEFT, leftAt: new Date() },
      });
      await tx.participant.updateMany({ where: { userId }, data: anonymous });
      // Detaches the participants, and takes the sessions, codes and phones with it.
      await tx.user.delete({ where: { id: userId } });
      return keys;
    });
    await this.storage.remove(keys);
  }
}
