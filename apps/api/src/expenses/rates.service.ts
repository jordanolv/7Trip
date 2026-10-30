import { Inject, Injectable, Logger } from '@nestjs/common';
import { hasEcbRate } from '@7trip/shared';
import { ENV, type Env } from '../config/env.js';

export interface DailyRate {
  /** 1 unit of `from` in `to`. */
  rate: number;
  /** The day the ECB published it (ISO). */
  date: string;
}

/** For tests (RATES_SOURCE=fixed): 1 unit in euros. */
const FIXED_IN_EUR: Record<string, number> = { EUR: 1, USD: 0.9, GBP: 1.2, JPY: 0.006, CHF: 1.05 };

/**
 * Today's ECB rate between two currencies, to fill in a new expense (docs/decisions.md, "Source des
 * taux"). Through Frankfurter, which needs no key. Kept an hour in memory: the ECB publishes once a
 * day. Null when the ECB does not publish one of them, or the service cannot be reached: the rate is
 * then typed by hand.
 */
@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);
  private readonly cache = new Map<string, { value: DailyRate; until: number }>();

  constructor(@Inject(ENV) private readonly env: Env) {}

  async rate(from: string, to: string): Promise<DailyRate | null> {
    if (from === to) return { rate: 1, date: new Date().toISOString().slice(0, 10) };
    if (!hasEcbRate(from) || !hasEcbRate(to)) return null;
    if (this.env.RATES_SOURCE === 'fixed') {
      const [a, b] = [FIXED_IN_EUR[from], FIXED_IN_EUR[to]];
      return a && b ? { rate: Number((a / b).toPrecision(10)), date: '2027-07-01' } : null;
    }
    const key = `${from}>${to}`;
    const cached = this.cache.get(key);
    if (cached && cached.until > Date.now()) return cached.value;
    try {
      const response = await fetch(`https://api.frankfurter.dev/v1/latest?from=${from}&to=${to}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { date?: string; rates?: Record<string, number> };
      const rate = body.rates?.[to];
      if (typeof rate !== 'number' || !(rate > 0) || typeof body.date !== 'string') throw new Error('unexpected answer');
      const value = { rate, date: body.date };
      this.cache.set(key, { value, until: Date.now() + 60 * 60 * 1000 });
      return value;
    } catch (error) {
      this.logger.warn(`No ECB rate ${from} → ${to}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
