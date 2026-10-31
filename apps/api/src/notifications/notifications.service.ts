import { Injectable } from '@nestjs/common';
import { formatDayMonth, formatMoney, formatTimeRange, resolveNotificationPrefs, type NotificationTopic } from '@7trip/shared';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';

type Tx = Prisma.TransactionClient;

/** What each kind of notification is about, for the participant's preferences. */
export const KIND_TOPIC: Record<string, NotificationTopic> = {
  'poll.created': 'POLLS',
  'poll.reminder': 'POLLS',
  'event.created': 'PLANNING',
  'event.changed': 'PLANNING',
  'event.deleted': 'PLANNING',
  daily: 'DAILY',
  settlement: 'SETTLEMENTS',
  'settlement.due': 'SETTLEMENTS',
  'expense.created': 'EXPENSES',
};

/** Planning edits made in a row are told once, with the last state. */
const EVENT_SETTLE_MS = 60_000;
/** The poll reminder comes a day before it closes. */
const POLL_REMINDER_MS = 24 * 3600_000;

interface Draft {
  kind: keyof typeof KIND_TOPIC;
  refId?: string;
  body: string;
  url: string;
  scheduledAt?: Date;
}

export interface EventSnapshot {
  id: string;
  tripId: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  place: string | null;
  participants: { participantId: string }[];
}

const toIso = (date: Date) => date.toISOString().slice(0, 10);

/** "14 juil. · 10:00 – 12:00 · Real Alcázar" */
const eventLine = (e: EventSnapshot) =>
  [
    formatDayMonth(toIso(e.startDate)) + (e.endDate ? ` – ${formatDayMonth(toIso(e.endDate))}` : ''),
    formatTimeRange(e),
    e.place,
  ]
    .filter(Boolean)
    .join(' · ');

const IMPORTANT_EVENT_FIELDS = ['title', 'startTime', 'endTime', 'place'] as const;

/**
 * The outbox (docs/architecture.md): each change worth telling writes its notifications in its
 * own transaction, so none is lost or sent for a change that was rolled back. NotificationsWorker
 * sends them. Only the useful ones (CDC §10.1, docs/decisions.md), to members with an account who
 * did not switch the topic off, never to the person who made the change.
 */
@Injectable()
export class NotificationsService {
  async pollCreated(tx: Tx, me: Participant, poll: { id: string; tripId: string; question: string; closesAt: Date | null }): Promise<void> {
    const to = await this.recipients(tx, poll.tripId, 'POLLS', { exclude: me.id });
    const url = `/voyage/${poll.tripId}/sondage/${poll.id}`;
    await this.enqueue(tx, poll.tripId, to, { kind: 'poll.created', refId: poll.id, body: `${me.displayName} demande : ${poll.question}`, url });
    const remindAt = poll.closesAt && new Date(poll.closesAt.getTime() - POLL_REMINDER_MS);
    // A poll closing within the day has just been announced: no reminder on top.
    if (remindAt && remindAt.getTime() > Date.now() + 3600_000) {
      // The author votes too: the reminder is for everyone who has not voted by then.
      const all = await this.recipients(tx, poll.tripId, 'POLLS');
      await this.enqueue(tx, poll.tripId, all, { kind: 'poll.reminder', refId: poll.id, body: `Plus que 24 h pour voter : ${poll.question}`, url, scheduledAt: remindAt });
    }
  }

  /**
   * An event of the planning created, changed or removed: told to the people taking part (the
   * whole group for an event without a list). Changes are only the ones that move it (days,
   * hours, place, title) or change who takes part.
   */
  async eventChanged(tx: Tx, me: Participant, before: EventSnapshot | null, after: EventSnapshot | null): Promise<void> {
    const event = (after ?? before)!;
    if (before && after && !eventMoved(before, after)) return;

    const lists = [before, after].filter((e) => e !== null).map((e) => e.participants.map((p) => p.participantId));
    const only = lists.some((ids) => ids.length === 0) ? undefined : [...new Set(lists.flat())];
    const to = await this.recipients(tx, event.tripId, 'PLANNING', { exclude: me.id, only });
    const title = await this.tripTitle(tx, event.tripId);
    const scheduledAt = new Date(Date.now() + EVENT_SETTLE_MS);

    for (const participant of to) {
      const key = `event:${event.id}:${participant.id}`;
      const pending = await tx.notification.findFirst({ where: { key, sentAt: null } });
      // Created then changed before anyone was told: still news of a new event.
      const isNew = !before || pending?.kind === 'event.created';
      if (pending) await tx.notification.delete({ where: { id: pending.id } });
      if (!after) {
        // Created and removed within the minute: nothing happened, as far as they know.
        if (pending?.kind === 'event.created') continue;
        await this.create(tx, title, participant, key, {
          kind: 'event.deleted',
          refId: event.id,
          body: `${event.title} est retiré du planning (${me.displayName})`,
          url: `/voyage/${event.tripId}/planning`,
          scheduledAt,
        });
        continue;
      }
      await this.create(tx, title, participant, key, {
        kind: isNew ? 'event.created' : 'event.changed',
        refId: after.id,
        body: `${isNew ? 'Nouveau' : 'Modifié'} : ${after.title} — ${eventLine(after)}`,
        url: `/voyage/${after.tripId}/evenement/${after.id}`,
        scheduledAt,
      });
    }
  }

  /** "C'est réglé": the two people concerned, except the one who said so. */
  async settlementRecorded(
    tx: Tx,
    me: Participant,
    settlement: { tripId: string; amountMinor: number; from: Participant; to: Participant },
    currency: string,
  ): Promise<void> {
    const { from, to, tripId } = settlement;
    const amount = formatMoney(settlement.amountMinor, currency);
    const url = `/voyage/${tripId}/finances?section=balances`;
    const [receiver] = await this.recipients(tx, tripId, 'SETTLEMENTS', { exclude: me.id, only: [to.id] });
    if (receiver) await this.enqueue(tx, tripId, [receiver], { kind: 'settlement', body: `${from.displayName} t’a remboursé ${amount}`, url });
    const [payer] = await this.recipients(tx, tripId, 'SETTLEMENTS', { exclude: me.id, only: [from.id] });
    if (payer) {
      const body = me.id === to.id ? `${to.displayName} a bien reçu tes ${amount}` : `${me.displayName} a noté ton remboursement de ${amount} à ${to.displayName}`;
      await this.enqueue(tx, tripId, [payer], { kind: 'settlement', body, url });
    }
  }

  /** Off by default: only for those who asked, and who have a share in it. */
  async expenseCreated(
    tx: Tx,
    me: Participant,
    expense: { id: string; tripId: string; label: string; baseAmountMinor: number; personal: boolean; shares: { participantId: string }[] },
    currency: string,
  ): Promise<void> {
    if (expense.personal) return;
    const to = await this.recipients(tx, expense.tripId, 'EXPENSES', { exclude: me.id, only: expense.shares.map((s) => s.participantId) });
    await this.enqueue(tx, expense.tripId, to, {
      kind: 'expense.created',
      refId: expense.id,
      body: `${me.displayName} a ajouté ${expense.label} · ${formatMoney(expense.baseAmountMinor, currency)}`,
      url: `/voyage/${expense.tripId}/depense/${expense.id}`,
    });
  }

  /** For the reminders planned by the worker. */
  async enqueue(tx: Tx, tripId: string, to: Participant[], draft: Draft & { key?: string }): Promise<void> {
    if (!to.length) return;
    const title = await this.tripTitle(tx, tripId);
    for (const participant of to) await this.create(tx, title, participant, draft.key ?? null, draft);
  }

  /** Active members with an account who keep `topic` on. */
  async recipients(tx: Tx, tripId: string, topic: NotificationTopic, { exclude, only }: { exclude?: string; only?: string[] } = {}): Promise<Participant[]> {
    const participants = await tx.participant.findMany({
      where: {
        tripId,
        status: ParticipantStatus.ACTIVE,
        userId: { not: null },
        ...(only && { id: { in: only } }),
        ...(exclude && { NOT: { id: exclude } }),
      },
    });
    return participants.filter((p) => resolveNotificationPrefs(p.notifPrefs)[topic]);
  }

  private async create(tx: Tx, title: string, participant: Participant, key: string | null, draft: Draft): Promise<void> {
    await tx.notification.create({
      data: {
        participantId: participant.id,
        kind: draft.kind,
        key,
        refId: draft.refId ?? null,
        title,
        body: draft.body,
        url: draft.url,
        ...(draft.scheduledAt && { scheduledAt: draft.scheduledAt }),
      },
    });
  }

  private async tripTitle(tx: Tx, tripId: string): Promise<string> {
    return (await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { title: true } })).title;
  }
}

function eventMoved(before: EventSnapshot, after: EventSnapshot): boolean {
  if (IMPORTANT_EVENT_FIELDS.some((field) => before[field] !== after[field])) return true;
  if (toIso(before.startDate) !== toIso(after.startDate)) return true;
  if ((before.endDate && toIso(before.endDate)) !== (after.endDate && toIso(after.endDate))) return true;
  const ids = (e: EventSnapshot) => e.participants.map((p) => p.participantId).sort().join();
  return ids(before) !== ids(after);
}
