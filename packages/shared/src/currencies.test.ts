import { convertShares, hasEcbRate, parseRate, rateInputText, rateSchema, toBaseMinor } from './currencies.js';
import { splitEqually } from './finance.js';

describe('toBaseMinor', () => {
  it('converts with the frozen rate, rounded to the hundredth', () => {
    expect(toBaseMinor(4800, 0.8985)).toBe(4313);
    expect(toBaseMinor(150000, 0.00632)).toBe(948);
  });
});

describe('convertShares', () => {
  it('always adds up to the converted total', () => {
    let seed = 11;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let run = 0; run < 2000; run++) {
      const amount = 1 + Math.floor(random() * 500_000);
      const people = Array.from({ length: 1 + Math.floor(random() * 8) }, (_, i) => `p${i}`);
      const rate = Number((random() * 200).toPrecision(6)) || 0.5;
      const total = toBaseMinor(amount, rate);
      const shares = convertShares(splitEqually(amount, people), rate, total);
      expect(shares.reduce((sum, s) => sum + s.baseMinor, 0)).toBe(total);
      expect(shares.every((s) => s.baseMinor >= 0 && Number.isInteger(s.baseMinor))).toBe(true);
    }
  });

  it('keeps equal parts equal, the extra hundredths going first in order', () => {
    // 100 USD between three at 0.9: 90 € → 30 € each.
    expect(convertShares(splitEqually(10000, ['a', 'b', 'c']), 0.9, 9000).map((s) => s.baseMinor)).toEqual([3000, 3000, 3000]);
    // 10 USD between three at 1: 3,34 / 3,33 / 3,33, as in dollars.
    expect(convertShares(splitEqually(1000, ['a', 'b', 'c']), 1, 1000).map((s) => s.baseMinor)).toEqual([334, 333, 333]);
  });

  it('follows typed amounts', () => {
    const shares = convertShares([{ amountMinor: 3000 }, { amountMinor: 1000 }], 0.5, 2000);
    expect(shares.map((s) => s.baseMinor)).toEqual([1500, 500]);
  });
});

describe('rates', () => {
  it('knows which currencies the ECB publishes', () => {
    expect(hasEcbRate('USD')).toBe(true);
    expect(hasEcbRate('MAD')).toBe(false);
  });

  it('refuses a zero or negative rate and keeps 10 significant digits', () => {
    expect(rateSchema.safeParse(0).success).toBe(false);
    expect(rateSchema.safeParse(-1).success).toBe(false);
    expect(rateSchema.parse(0.123456789012345)).toBe(0.123456789);
    // Stored with 10 decimals: converted with what is stored.
    expect(rateSchema.parse(0.006123456789)).toBe(0.0061234568);
    expect(rateSchema.safeParse(1e-12).success).toBe(false);
  });
});

describe('rate fields', () => {
  it('reads a rate typed in French or English', () => {
    expect(parseRate('0,8985')).toBe(0.8985);
    expect(parseRate(' 158.06 ')).toBe(158.06);
    expect(parseRate('0')).toBeNull();
    expect(parseRate('abc')).toBeNull();
    expect(rateInputText(0.89847)).toBe('0,89847');
  });
});
