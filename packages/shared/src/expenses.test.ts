import { describe, expect, it } from 'vitest';

import { createExpenseRequestSchema, createSettlementRequestSchema, expenseShares, formatMoney, parseAmount } from './expenses.js';

const [a, b, c] = ['01a1841b-0000-7000-8000-00000000000a', '01a1841b-0000-7000-8000-00000000000b', '01a1841b-0000-7000-8000-00000000000c'];
const base = { label: 'Tapas', amountMinor: 4800, date: '2027-07-12', payerId: a };

describe('createExpenseRequestSchema', () => {
  it('needs a split for a shared expense, not for a personal one', () => {
    expect(createExpenseRequestSchema.safeParse(base).success).toBe(false);
    expect(createExpenseRequestSchema.safeParse({ ...base, personal: true }).success).toBe(true);
    expect(createExpenseRequestSchema.safeParse({ ...base, split: { mode: 'EQUAL', participantIds: [a, b] } }).success).toBe(true);
  });

  it('refuses custom shares that do not add up, and people counted twice', () => {
    const wrong = createExpenseRequestSchema.safeParse({ ...base, split: { mode: 'CUSTOM', shares: [{ participantId: a, amountMinor: 1000 }] } });
    expect(wrong.error?.issues[0]?.message).toBe('Les parts font 10,00 € au lieu de 48,00 €');
    expect(createExpenseRequestSchema.safeParse({ ...base, split: { mode: 'EQUAL', participantIds: [a, a] } }).success).toBe(false);
  });

  it('refuses zero, negative and fractional amounts', () => {
    for (const amountMinor of [0, -100, 12.5]) {
      expect(createExpenseRequestSchema.safeParse({ ...base, amountMinor, personal: true }).success).toBe(false);
    }
  });
});

describe('expenseShares', () => {
  it('splits equally in join order, whatever order the people were ticked in', () => {
    expect(expenseShares({ ...base, amountMinor: 1000, personal: false, split: { mode: 'EQUAL', participantIds: [c, a, b] } }, [a, b, c])).toEqual([
      { participantId: a, amountMinor: 334 },
      { participantId: b, amountMinor: 333 },
      { participantId: c, amountMinor: 333 },
    ]);
  });

  it('gives a personal expense to its payer, and drops custom shares of zero', () => {
    expect(expenseShares({ ...base, personal: true }, [a, b])).toEqual([{ participantId: a, amountMinor: 4800 }]);
    const custom = { mode: 'CUSTOM' as const, shares: [{ participantId: a, amountMinor: 4800 }, { participantId: b, amountMinor: 0 }] };
    expect(expenseShares({ ...base, personal: false, split: custom }, [a, b])).toEqual([{ participantId: a, amountMinor: 4800 }]);
  });
});

describe('amounts', () => {
  it('parses what people type', () => {
    expect(parseAmount('48')).toBe(4800);
    expect(parseAmount('48,5')).toBe(4850);
    expect(parseAmount('1 284,00')).toBe(128400);
    expect(parseAmount('12.30 €')).toBe(1230);
    expect(parseAmount('12,345')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('formats in French', () => {
    expect(formatMoney(128400)).toBe('1 284,00 €');
    expect(formatMoney(128400, 'EUR', { whole: true })).toBe('1 284 €');
    expect(formatMoney(-2450)).toBe('− 24,50 €');
    expect(formatMoney(500, 'USD')).toBe('5,00 $');
    expect(formatMoney(150000, 'JPY')).toBe('1 500 ¥');
    expect(formatMoney(150050, 'JPY')).toBe('1 500,50 ¥');
    expect(formatMoney(500, 'MAD')).toBe('5,00 MAD');
  });
});

describe('createSettlementRequestSchema', () => {
  it('refuses repaying yourself', () => {
    expect(createSettlementRequestSchema.safeParse({ fromId: a, toId: a, amountMinor: 100 }).success).toBe(false);
    expect(createSettlementRequestSchema.safeParse({ fromId: a, toId: b, amountMinor: 100 }).success).toBe(true);
  });
});
