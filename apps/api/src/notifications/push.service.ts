import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationData } from '@7trip/shared';
import { ENV, type Env } from '../config/env.js';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: NotificationData;
}

/** `unregistered`: the phone no longer accepts them (app removed, permission withdrawn). */
export type PushOutcome = 'ok' | 'unregistered' | 'error';

/** `retry`: Expo could not be reached for it, to send again later. */
export type SendOutcome = PushOutcome | 'retry';

/** Per message, in order. `ticketId`: accepted by Expo, its receipt tells later whether it was delivered. */
export interface PushResult {
  outcome: SendOutcome;
  ticketId?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
/** Expo takes at most 1000 receipt ids per request. */
const RECEIPTS_BATCH = 1000;
/** Expo takes at most 100 messages per request. */
const BATCH = 100;

/**
 * Sends to the phones through Expo's push service, which forwards to Apple and Google
 * (docs/architecture.md). PUSH_DRIVER=memory keeps them in `sent`, for tests.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  /** PUSH_DRIVER=memory: every message, in order. */
  readonly sent: PushMessage[] = [];
  /** PUSH_DRIVER=memory: tokens answered as no longer registered when sent. */
  readonly unregistered = new Set<string>();
  /** PUSH_DRIVER=memory: tokens accepted when sent, then refused by Apple or Google (in the receipt). */
  readonly refusedLater = new Set<string>();
  /** PUSH_DRIVER=memory: tokens whose batch Expo could not take. */
  readonly unreachable = new Set<string>();
  private readonly memoryTickets = new Map<string, string>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** By batches of 100: a batch Expo could not take is `retry`, the others keep their outcome. */
  async send(messages: PushMessage[]): Promise<PushResult[]> {
    if (this.env.PUSH_DRIVER === 'memory') {
      this.sent.push(...messages.filter((m) => !this.unreachable.has(m.to)));
      return messages.map((m) => {
        if (this.unregistered.has(m.to)) return { outcome: 'unregistered' };
        if (this.unreachable.has(m.to)) return { outcome: 'retry' };
        const ticketId = `ticket-${this.sent.length}-${Math.random()}`;
        this.memoryTickets.set(ticketId, m.to);
        return { outcome: 'ok', ticketId };
      });
    }
    const results: PushResult[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      try {
        results.push(...(await this.sendBatch(batch)));
      } catch (error) {
        this.logger.warn(`Expo push unreachable: ${(error as Error).message}`);
        results.push(...batch.map((): PushResult => ({ outcome: 'retry' })));
      }
    }
    return results;
  }

  private async sendBatch(messages: PushMessage[]): Promise<PushResult[]> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default' }))),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Expo push: HTTP ${response.status}`);
    const { data } = (await response.json()) as { data: ExpoStatus[] };
    return data.map((ticket) => (ticket.status === 'ok' ? { outcome: 'ok', ticketId: ticket.id } : { outcome: this.failure(ticket) }));
  }

  /**
   * Whether Apple or Google delivered what Expo accepted, by ticket id; ids missing from the answer
   * are not known yet. Throws when Expo cannot be reached.
   */
  async receipts(ticketIds: string[]): Promise<Map<string, PushOutcome>> {
    const outcomes = new Map<string, PushOutcome>();
    if (this.env.PUSH_DRIVER === 'memory') {
      for (const id of ticketIds) {
        const token = this.memoryTickets.get(id);
        if (token) outcomes.set(id, this.refusedLater.has(token) ? 'unregistered' : 'ok');
      }
      return outcomes;
    }
    for (let i = 0; i < ticketIds.length; i += RECEIPTS_BATCH) {
      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ ids: ticketIds.slice(i, i + RECEIPTS_BATCH) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Expo receipts: HTTP ${response.status}`);
      const { data } = (await response.json()) as { data: Record<string, ExpoStatus> };
      for (const [id, receipt] of Object.entries(data)) outcomes.set(id, receipt.status === 'ok' ? 'ok' : this.failure(receipt));
    }
    return outcomes;
  }

  private failure(status: ExpoStatus): PushOutcome {
    if (status.details?.error === 'DeviceNotRegistered') return 'unregistered';
    this.logger.warn(`Expo push refused a message: ${status.details?.error ?? status.message}`);
    return 'error';
  }

  private headers() {
    return {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(this.env.EXPO_ACCESS_TOKEN && { authorization: `Bearer ${this.env.EXPO_ACCESS_TOKEN}` }),
    };
  }
}

/** A ticket (when sent) or a receipt (once delivered or refused). */
interface ExpoStatus {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}
