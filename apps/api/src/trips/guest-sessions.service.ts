import { convertShares, splitEqually } from '@7trip/shared';
import { Injectable } from '@nestjs/common';
import { sha256 } from '../auth/crypto.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Guest → account (docs/architecture.md §3). Everything in a trip points to a participant, so
 * attaching the guest participant to the user keeps all of it: nothing is copied.
 */
@Injectable()
export class GuestSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Attaches the participants behind these guest tokens to the user. Unknown or ended tokens are ignored. */
  async claim(userId: string, tokens: string[]): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    for (const token of new Set(tokens)) {
      const guest = await this.prisma.participant.findUnique({ where: { guestTokenHash: sha256(token) } });
      if (guest?.status !== ParticipantStatus.ACTIVE) continue;

      await this.prisma.$transaction(async (tx) => {
        // Same lock as membership changes: the guest cannot be removed halfway through.
        await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${guest.tripId}::uuid FOR UPDATE`;
        const current = await tx.participant.findFirst({ where: { id: guest.id, status: ParticipantStatus.ACTIVE, guestTokenHash: guest.guestTokenHash } });
        if (!current) return;

        const account = await tx.participant.findUnique({ where: { tripId_userId: { tripId: guest.tripId, userId } } });
        if (account?.status === ParticipantStatus.ACTIVE) {
          await this.merge(tx, current, account);
          return;
        }
        // A former participation of the account stays as it was ("(parti)"), detached so the guest one takes its place.
        if (account) await tx.participant.update({ where: { id: account.id }, data: { userId: null } });
        await tx.participant.update({
          where: { id: current.id },
          data: { userId, displayName: user.displayName, avatarColor: user.avatarColor, guestTokenHash: null },
        });
      });
    }
  }

  /**
   * The user was already in the trip with their account: the guest participation ends there.
   * Each step that adds content owned by participants (votes, ideas, expenses…) moves it here
   * from `guest` to `account`, so nothing is lost.
   */
  private async merge(tx: Prisma.TransactionClient, guest: Participant, account: Participant): Promise<void> {
    await tx.idea.updateMany({ where: { authorId: guest.id }, data: { authorId: account.id } });
    await tx.event.updateMany({ where: { authorId: guest.id }, data: { authorId: account.id } });
    // On an event both were on, the account is already listed: drop the guest's line, move the others.
    await tx.eventParticipant.deleteMany({
      where: { participantId: guest.id, event: { participants: { some: { participantId: account.id } } } },
    });
    await tx.eventParticipant.updateMany({ where: { participantId: guest.id }, data: { participantId: account.id } });
    await tx.poll.updateMany({ where: { authorId: guest.id }, data: { authorId: account.id } });
    await tx.poll.updateMany({ where: { closedById: guest.id }, data: { closedById: account.id } });
    // On a poll both voted in, the account's vote stands: the guest's is dropped, the others move.
    await tx.vote.deleteMany({
      where: { participantId: guest.id, option: { poll: { options: { some: { votes: { some: { participantId: account.id } } } } } } },
    });
    await tx.vote.updateMany({ where: { participantId: guest.id }, data: { participantId: account.id } });
    await tx.expense.updateMany({ where: { authorId: guest.id }, data: { authorId: account.id } });
    await tx.expense.updateMany({ where: { payerId: guest.id }, data: { payerId: account.id } });
    // On an expense both were in, the guest's share joins the account's: the total stays the same.
    const guestShares = await tx.expenseShare.findMany({ where: { participantId: guest.id } });
    for (const { expenseId, amountMinor, originalMinor } of guestShares) {
      const guestKey = { expenseId_participantId: { expenseId, participantId: guest.id } };
      const accountKey = { expenseId_participantId: { expenseId, participantId: account.id } };
      if (await tx.expenseShare.findUnique({ where: accountKey })) {
        await tx.expenseShare.update({ where: accountKey, data: { amountMinor: { increment: amountMinor }, originalMinor: { increment: originalMinor } } });
        await tx.expenseShare.delete({ where: guestKey });
      } else {
        await tx.expenseShare.update({ where: guestKey, data: { participantId: account.id } });
      }
    }
    await this.keepMergedShares(tx, guestShares.map((s) => s.expenseId));
    // A reimbursement between the two is now from someone to themselves: it no longer means anything.
    await tx.settlement.deleteMany({
      where: { OR: [{ fromId: guest.id, toId: account.id }, { fromId: account.id, toId: guest.id }] },
    });
    await tx.settlement.updateMany({ where: { fromId: guest.id }, data: { fromId: account.id } });
    await tx.settlement.updateMany({ where: { toId: guest.id }, data: { toId: account.id } });
    await tx.settlement.updateMany({ where: { createdById: guest.id }, data: { createdById: account.id } });
    await tx.participant.update({
      where: { id: guest.id },
      data: { status: ParticipantStatus.LEFT, leftAt: new Date(), guestTokenHash: null },
    });
  }

  /**
   * An equal split is computed again on each edit, the extra cents going to whoever joined first.
   * After the merge the shares may no longer be what that gives: two shares added up, or the
   * account joined before the guest and the cents would move. Those expenses keep their amounts.
   */
  private async keepMergedShares(tx: Prisma.TransactionClient, expenseIds: string[]): Promise<void> {
    const expenses = await tx.expense.findMany({
      where: { id: { in: expenseIds }, splitMode: 'EQUAL' },
      include: { shares: { include: { participant: { select: { joinedAt: true } } } } },
    });
    for (const expense of expenses) {
      const ordered = [...expense.shares].sort((a, b) => a.participant.joinedAt.getTime() - b.participant.joinedAt.getTime());
      // What an edit would compute: equal parts in the expense's currency, then converted.
      const equal = convertShares(splitEqually(expense.amountMinor, ordered.map((s) => s.participantId)), Number(expense.rateToBase), expense.baseAmountMinor);
      if (equal.every((share, i) => share.amountMinor === ordered[i]!.originalMinor && share.baseMinor === ordered[i]!.amountMinor)) continue;
      await tx.expense.update({ where: { id: expense.id }, data: { splitMode: 'CUSTOM', version: { increment: 1 } } });
    }
  }
}
