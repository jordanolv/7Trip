import { Inject, Injectable, Logger } from '@nestjs/common';
import type { NotificationData } from '@7trip/shared';
import { ENV, type Env } from '../config/env.js';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: NotificationData;
}

/** Per message, in order. `unregistered`: the phone no longer accepts them (app removed, permission withdrawn). */
export type PushResult = 'ok' | 'unregistered' | 'error';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
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
  /** PUSH_DRIVER=memory: tokens answered as no longer registered. */
  readonly unregistered = new Set<string>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** Throws when Expo cannot be reached: the worker tries again later. */
  async send(messages: PushMessage[]): Promise<PushResult[]> {
    if (this.env.PUSH_DRIVER === 'memory') {
      this.sent.push(...messages);
      return messages.map((m) => (this.unregistered.has(m.to) ? 'unregistered' : 'ok'));
    }
    const results: PushResult[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      results.push(...(await this.sendBatch(messages.slice(i, i + BATCH))));
    }
    return results;
  }

  private async sendBatch(messages: PushMessage[]): Promise<PushResult[]> {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...(this.env.EXPO_ACCESS_TOKEN && { authorization: `Bearer ${this.env.EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default' }))),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Expo push: HTTP ${response.status}`);
    const { data } = (await response.json()) as { data: { status: 'ok' | 'error'; message?: string; details?: { error?: string } }[] };
    return data.map((ticket) => {
      if (ticket.status === 'ok') return 'ok';
      if (ticket.details?.error === 'DeviceNotRegistered') return 'unregistered';
      this.logger.warn(`Expo push refused a message: ${ticket.details?.error ?? ticket.message}`);
      return 'error';
    });
  }
}
