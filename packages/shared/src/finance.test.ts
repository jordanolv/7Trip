import { computeBalances, personalCost, splitEqually, suggestTransfers } from './finance.js';

describe('splitEqually', () => {
  it('gives leftover cents to the first participants and keeps the total', () => {
    const shares = splitEqually(10_000, ['a', 'b', 'c']);
    expect(shares.map((s) => s.amountMinor)).toEqual([3334, 3333, 3333]);
    expect(shares.reduce((sum, s) => sum + s.amountMinor, 0)).toBe(10_000);
  });

  it('splits the spec example evenly: 120 € between four people is 30 € each', () => {
    expect(splitEqually(12_000, ['a', 'b', 'c', 'd']).map((s) => s.amountMinor)).toEqual([
      3000, 3000, 3000, 3000,
    ]);
  });

  it('rejects empty, duplicated or non-integer inputs', () => {
    expect(() => splitEqually(100, [])).toThrow(RangeError);
    expect(() => splitEqually(100, ['a', 'a'])).toThrow(RangeError);
    expect(() => splitEqually(10.5, ['a'])).toThrow(RangeError);
    expect(() => splitEqually(-1, ['a'])).toThrow(RangeError);
  });
});

describe('computeBalances', () => {
  it('distinguishes the amount advanced from the actual cost', () => {
    // Thomas pays 81 € of tickets for six people.
    const ids = ['thomas', 'lea', 'jordan', 'camille', 'hugo', 'ines'];
    const balances = computeBalances([
      { payerId: 'thomas', amountMinor: 8100, shares: splitEqually(8100, ids) },
    ]);
    expect(balances.get('thomas')).toBe(8100 - 1350);
    expect(balances.get('jordan')).toBe(-1350);
    expect([...balances.values()].reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('handles a payer who is not a beneficiary', () => {
    const balances = computeBalances([
      { payerId: 'lea', amountMinor: 4000, shares: splitEqually(4000, ['jordan', 'thomas']) },
    ]);
    expect(balances.get('lea')).toBe(4000);
    expect(balances.get('jordan')).toBe(-2000);
    expect(balances.get('thomas')).toBe(-2000);
  });

  it('leaves balances untouched for a personal expense', () => {
    const balances = computeBalances([
      { payerId: 'jordan', amountMinor: 1200, shares: [{ participantId: 'jordan', amountMinor: 1200 }] },
    ]);
    expect(balances.get('jordan')).toBe(0);
  });

  it('moves both sides towards zero when a reimbursement is recorded', () => {
    const expenses = [
      { payerId: 'lea', amountMinor: 4250, shares: [{ participantId: 'jordan', amountMinor: 4250 }] },
    ];
    const balances = computeBalances(expenses, [{ fromId: 'jordan', toId: 'lea', amountMinor: 4250 }]);
    expect(balances.get('jordan')).toBe(0);
    expect(balances.get('lea')).toBe(0);
  });

  it('rejects shares that do not add up to the amount', () => {
    expect(() =>
      computeBalances([
        { payerId: 'a', amountMinor: 1000, shares: [{ participantId: 'b', amountMinor: 900 }] },
      ]),
    ).toThrow(RangeError);
  });
});

describe('suggestTransfers', () => {
  it('settles everyone with at most n − 1 transfers', () => {
    // Balances from the "Soldes" mockup.
    const balances = new Map([
      ['jordan', -2450],
      ['lea', 4250],
      ['thomas', 3120],
      ['camille', 0],
      ['hugo', -3120],
      ['ines', -1800],
    ]);
    const transfers = suggestTransfers(balances);
    expect(transfers.length).toBeLessThanOrEqual(5);

    const after = new Map(balances);
    for (const t of transfers) {
      after.set(t.fromId, after.get(t.fromId)! + t.amountMinor);
      after.set(t.toId, after.get(t.toId)! - t.amountMinor);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
  });

  it('is deterministic', () => {
    const balances = new Map([
      ['b', -500],
      ['a', -500],
      ['c', 1000],
    ]);
    expect(suggestTransfers(balances)).toEqual(suggestTransfers(new Map([...balances].reverse())));
  });
});

describe('personalCost', () => {
  it('counts only the participant’s own shares, not what they advanced', () => {
    const ids = ['jordan', 'lea', 'thomas', 'camille', 'hugo', 'ines'];
    const expenses = [
      { payerId: 'jordan', amountMinor: 9600, shares: splitEqually(9600, ids) },
      { payerId: 'lea', amountMinor: 6420, shares: splitEqually(6420, ids) },
    ];
    expect(personalCost(expenses, 'jordan')).toBe(1600 + 1070);
  });
});
