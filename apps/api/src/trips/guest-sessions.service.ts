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
          data: { userId, displayName: user.displayName, guestTokenHash: null },
        });
      });
    }
  }

  /**
   * The user was already in the trip with their account: the guest participation ends there.
   * Each step that adds content owned by participants (votes, ideas, expenses…) moves it here
   * from `guest` to `account`, so nothing is lost.
   */
  private async merge(tx: Prisma.TransactionClient, guest: Participant, _account: Participant): Promise<void> {
    await tx.participant.update({
      where: { id: guest.id },
      data: { status: ParticipantStatus.LEFT, leftAt: new Date(), guestTokenHash: null },
    });
  }
}
