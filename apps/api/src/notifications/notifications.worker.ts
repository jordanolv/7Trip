import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { DAILY_REMINDER_HOUR, computeBalances, formatMoney, resolveNotificationPrefs, zonedDayAndHour } from '@7trip/shared';
import { ENV, type Env } from '../config/env.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { KIND_TOPIC, NotificationsService } from './notifications.service.js';
import { PushService, type PushMessage } from './push.service.js';

const TICK_MS = 30_000;
/** The reminders are planned less often than the outbox is sent. */
const PLAN_EVERY_MS = 5 * 60_000;
/** A notification claimed by a worker that stopped halfway is taken again after this. */
const CLAIM_TIMEOUT_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
/** Expo has the receipts a few minutes after sending; it keeps them a day. */
const RECEIPT_AFTER_MS = 15 * 60_000;
const RECEIPT_GIVE_UP_MS = 20 * 3600_000;
/** Sent notifications are kept a while, to look into a complaint, then dropped. */
const KEEP_SENT_DAYS = 30;
/** Not sent after noon: a morning reminder late in the day is noise. */
const DAILY_UNTIL_HOUR = 12;
/** What is still owed is told once, in the week after the trip, during the day. */
const DUE_FROM_HOUR = 10;
const DUE_UNTIL_HOUR = 20;
const DUE_WITHIN_DAYS = 7;
const DAY_MS = 24 * 3600_000;

const toIso = (date: Date) => date.toISOString().slice(0, 10);
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const daysBetween = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);

/**
 * Sends the outbox through Expo every 30 s, and plans the reminders that depend on the time: the
 * morning one during the trip (8 h on the phone's clock), and what is still owed once it is over.
 * One API instance in V1: the claim (FOR UPDATE SKIP LOCKED) already lets several share the work.
 */
@Injectable()
export class NotificationsWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastPlan = 0;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly push: PushService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.env.NOTIFICATIONS_WORKER) return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  /** One pass. Tests call planReminders and sendDue by hand, with the time they need. */
  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      // Each step on its own: one failing (Expo's receipts unreachable…) must not hold back the others.
      if (now.getTime() - this.lastPlan >= PLAN_EVERY_MS) {
        this.lastPlan = now.getTime();
        await this.step('reminders', () => this.planReminders(now));
        await this.step('receipts', () => this.checkReceipts(now));
      }
      await this.step('sending', () => this.sendDue(now));
      await this.step('cleanup', () =>
        this.prisma.notification.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - KEEP_SENT_DAYS * DAY_MS) } } }),
      );
    } finally {
      this.running = false;
    }
  }

  private async step(name: string, run: () => Promise<unknown>): Promise<void> {
    try {
      await run();
    } catch (error) {
      this.logger.error(`Notifications, ${name}: ${(error as Error).message}`);
    }
  }

  async sendDue(now: Date): Promise<void> {
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "Notification" SET "claimedAt" = ${now}, "attempts" = "attempts" + 1
      WHERE id IN (
        SELECT id FROM "Notification"
        WHERE "sentAt" IS NULL AND "scheduledAt" <= ${now}
          AND ("claimedAt" IS NULL OR "claimedAt" < ${new Date(now.getTime() - CLAIM_TIMEOUT_MS)})
        ORDER BY "scheduledAt" LIMIT 200
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`;
    if (!claimed.length) return;

    const rows = await this.prisma.notification.findMany({
      where: { id: { in: claimed.map((c) => c.id) } },
      include: { participant: { include: { user: { include: { pushTokens: { orderBy: { updatedAt: 'desc' } } } } } } },
    });
    const outcomes = new Map<string, string>();
    const messages: { id: string; message: PushMessage }[] = [];
    for (const row of rows) {
      const { participant } = row;
      if (row.attempts > MAX_ATTEMPTS) outcomes.set(row.id, 'failed');
      else if (participant.status !== ParticipantStatus.ACTIVE || !participant.user) outcomes.set(row.id, 'skipped');
      else if (!resolveNotificationPrefs(participant.notifPrefs)[KIND_TOPIC[row.kind] ?? 'POLLS']) outcomes.set(row.id, 'skipped');
      else if (!(await this.stillRelevant(row, now, participant.user.pushTokens[0]?.timeZone))) outcomes.set(row.id, 'skipped');
      else if (!participant.user.pushTokens.length) outcomes.set(row.id, 'no-device');
      else {
        // What is owed may have been paid back since it was planned: told as it is now, or not at all.
        const body = row.kind === 'settlement.due' ? await this.stillOwed(participant.tripId, participant.id) : row.body;
        if (body === null) {
          outcomes.set(row.id, 'skipped');
          continue;
        }
        for (const { token } of participant.user.pushTokens) {
          messages.push({ id: row.id, message: { to: token, title: row.title, body, data: { url: row.url } } });
        }
      }
    }

    if (messages.length) {
      const results = await this.push.send(messages.map((m) => m.message));
      const gone = messages.filter((_, i) => results[i]!.outcome === 'unregistered').map((m) => m.message.to);
      if (gone.length) await this.prisma.pushToken.deleteMany({ where: { token: { in: gone } } });
      const tickets = messages.flatMap((m, i) => (results[i]!.ticketId ? [{ id: results[i]!.ticketId!, token: m.message.to }] : []));
      if (tickets.length) await this.prisma.pushTicket.createMany({ data: tickets, skipDuplicates: true });
      for (const [i, { id }] of messages.entries()) {
        const { outcome } = results[i]!;
        if (outcome === 'ok') outcomes.set(id, 'sent');
        // Expo unreachable for it: left claimed, taken again in a few minutes, unless it reached
        // another of the account's phones (sent again, that one would get it twice).
        else if (outcome === 'retry') continue;
        else if (!outcomes.has(id)) outcomes.set(id, outcome === 'unregistered' ? 'no-device' : 'failed');
      }
    }

    for (const outcome of new Set(outcomes.values())) {
      const ids = [...outcomes].filter(([, o]) => o === outcome).map(([id]) => id);
      await this.prisma.notification.updateMany({ where: { id: { in: ids } }, data: { sentAt: now, outcome } });
    }
  }

  /**
   * What Expo accepted, Apple or Google may still refuse: a phone answered as no longer registered
   * is forgotten. Other refusals are only logged (by PushService); the notification is not sent
   * again.
   */
  async checkReceipts(now: Date): Promise<void> {
    const due = await this.prisma.pushTicket.findMany({
      where: { createdAt: { lte: new Date(now.getTime() - RECEIPT_AFTER_MS) } },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
    if (!due.length) return;
    const receipts = await this.push.receipts(due.map((t) => t.id));
    const gone = due.filter((t) => receipts.get(t.id) === 'unregistered').map((t) => t.token);
    if (gone.length) await this.prisma.pushToken.deleteMany({ where: { token: { in: gone } } });
    // Done with: answered, or too old for Expo to still know it.
    const done = due.filter((t) => receipts.has(t.id) || t.createdAt.getTime() < now.getTime() - RECEIPT_GIVE_UP_MS).map((t) => t.id);
    await this.prisma.pushTicket.deleteMany({ where: { id: { in: done } } });
  }

  /**
   * Planned or waiting a while: a poll may have closed or been voted in, an expense turned
   * personal, an event been removed; a morning reminder kept back by an outage is old news.
   */
  private async stillRelevant(row: { kind: string; key: string | null; refId: string | null; participantId: string }, now: Date, zone?: string): Promise<boolean> {
    if (row.kind === 'daily') {
      const day = row.key?.split(':')[2];
      if (!zone || !day) return false;
      const local = zonedDayAndHour(now, zone);
      return local.day === day && local.hour < DAILY_UNTIL_HOUR;
    }
    if (row.kind === 'event.created' || row.kind === 'event.changed') {
      return !!row.refId && (await this.prisma.event.count({ where: { id: row.refId } })) > 0;
    }
    if (row.kind === 'expense.created') {
      // Still shared, and still one of theirs: otherwise they can no longer open it.
      return !!row.refId && (await this.prisma.expense.count({ where: { id: row.refId, personal: false, shares: { some: { participantId: row.participantId } } } })) > 0;
    }
    if (!row.kind.startsWith('poll.')) return true;
    const poll = row.refId ? await this.prisma.poll.findUnique({ where: { id: row.refId } }) : null;
    if (!poll || poll.closedAt || (poll.closesAt && poll.closesAt <= now)) return false;
    if (row.kind === 'poll.created') return true;
    const voted = await this.prisma.vote.count({ where: { participantId: row.participantId, option: { pollId: poll.id } } });
    return voted === 0;
  }

  /**
   * Members of a trip under way, or just over, with a phone: their day and hour are read on the
   * phone's clock (the last one used). Each reminder has a key, so it is planned once.
   */
  async planReminders(now: Date): Promise<void> {
    const participants = await this.prisma.participant.findMany({
      where: {
        status: ParticipantStatus.ACTIVE,
        user: { pushTokens: { some: {} } },
        trip: {
          startDate: { lte: new Date(now.getTime() + DAY_MS) },
          OR: [
            { endDate: { gte: new Date(now.getTime() - (DUE_WITHIN_DAYS + 2) * DAY_MS) } },
            { endDate: null, startDate: { gte: new Date(now.getTime() - 2 * DAY_MS) } },
          ],
        },
      },
      include: { trip: true, user: { include: { pushTokens: { orderBy: { updatedAt: 'desc' }, take: 1 } } } },
    });
    const balancesByTrip = new Map<string, Map<string, number>>();

    for (const participant of participants) {
      const { trip } = participant;
      const zone = participant.user?.pushTokens[0]?.timeZone;
      if (!zone || !trip.startDate) continue;
      const { day, hour } = zonedDayAndHour(now, zone);
      const start = toIso(trip.startDate);
      const end = toIso(trip.endDate ?? trip.startDate);
      const prefs = resolveNotificationPrefs(participant.notifPrefs);

      if (prefs.DAILY && start <= day && day <= end && hour >= DAILY_REMINDER_HOUR && hour < DAILY_UNTIL_HOUR) {
        const key = `daily:${participant.id}:${day}`;
        if (!(await this.prisma.notification.count({ where: { key } }))) {
          const body = await this.dayProgramme(trip.id, participant.id, day);
          // A day with nothing planned for them: nothing worth waking the phone for.
          if (body) {
            const dayNumber = daysBetween(start, day) + 1;
            const total = daysBetween(start, end) + 1;
            await this.prisma.$transaction((tx) =>
              this.notifications.enqueue(tx, trip.id, [participant], {
                kind: 'daily',
                key,
                body: `Jour ${dayNumber} sur ${total} — ${body}`,
                url: `/voyage/${trip.id}`,
              }),
            );
          }
        }
      }

      const sinceEnd = daysBetween(end, day);
      if (prefs.SETTLEMENTS && sinceEnd >= 1 && sinceEnd <= DUE_WITHIN_DAYS && hour >= DUE_FROM_HOUR && hour < DUE_UNTIL_HOUR) {
        const key = `due:${participant.id}`;
        if (!(await this.prisma.notification.count({ where: { key } }))) {
          if (!balancesByTrip.has(trip.id)) balancesByTrip.set(trip.id, await this.balances(trip.id));
          const owed = -(balancesByTrip.get(trip.id)!.get(participant.id) ?? 0);
          if (owed > 0) {
            await this.prisma.$transaction((tx) =>
              this.notifications.enqueue(tx, trip.id, [participant], {
                kind: 'settlement.due',
                key,
                body: dueMessage(owed, trip.baseCurrency),
                url: `/voyage/${trip.id}/finances?section=balances`,
              }),
            );
          }
        }
      }
    }
  }

  /** "3 au programme : 10:00 Alcázar, 13:30 Eslava, Flamenco" — null when nothing concerns them. */
  private async dayProgramme(tripId: string, participantId: string, day: string): Promise<string | null> {
    const date = toDate(day);
    const events = await this.prisma.event.findMany({
      where: {
        tripId,
        startDate: { lte: date },
        AND: [
          { OR: [{ endDate: null, startDate: date }, { endDate: { gte: date } }] },
          { OR: [{ participants: { none: {} } }, { participants: { some: { participantId } } }] },
        ],
      },
      orderBy: [{ startTime: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    });
    if (!events.length) return null;
    const shown = events.slice(0, 3).map((e) => (e.startTime && toIso(e.startDate) === day ? `${e.startTime} ${e.title}` : e.title));
    const more = events.length > 3 ? ` +${events.length - 3}` : '';
    return `${events.length} au programme : ${shown.join(', ')}${more}`;
  }

  /** The reminder of what is owed, from the balances of now; null once nothing is. */
  private async stillOwed(tripId: string, participantId: string): Promise<string | null> {
    const owed = -((await this.balances(tripId)).get(participantId) ?? 0);
    if (owed <= 0) return null;
    const { baseCurrency } = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId }, select: { baseCurrency: true } });
    return dueMessage(owed, baseCurrency);
  }

  private async balances(tripId: string): Promise<Map<string, number>> {
    const expenses = await this.prisma.expense.findMany({ where: { tripId, personal: false }, include: { shares: true } });
    const settlements = await this.prisma.settlement.findMany({ where: { tripId } });
    return computeBalances(
      expenses.map((e) => ({ payerId: e.payerId, amountMinor: e.baseAmountMinor, shares: e.shares })),
      settlements,
    );
  }
}

const dueMessage = (owedMinor: number, currency: string) => `Le voyage est fini : il te reste ${formatMoney(owedMinor, currency)} à rembourser`;
