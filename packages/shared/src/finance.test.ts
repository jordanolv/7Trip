import {
  computeBalances,
  isBestTransferPlan,
  minTransferCount,
  personalCost,
  splitEqually,
  suggestTransfers,
  transferPlans,
  type Transfer,
} from './finance.js';

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

/** Balances left once the transfers are made: all zero when the plan squares everyone. */
function applyTransfers(balances: Map<string, number>, transfers: Transfer[]): Map<string, number> {
  const after = new Map(balances);
  for (const t of transfers) {
    after.set(t.fromId, (after.get(t.fromId) ?? 0) + t.amountMinor);
    after.set(t.toId, (after.get(t.toId) ?? 0) - t.amountMinor);
  }
  return after;
}

/**
 * Reference for the minimum, by brute force: every way to split the people into groups, keeping
 * the one with the most groups that add up to zero (n − groups transfers).
 */
function bruteForceMinimum(balances: Map<string, number>): number {
  const amounts = [...balances.values()].filter((v) => v !== 0);
  let most = 0;
  const visit = (index: number, sums: number[]) => {
    if (index === amounts.length) {
      if (sums.every((s) => s === 0)) most = Math.max(most, sums.length);
      return;
    }
    for (let g = 0; g < sums.length; g++) {
      sums[g]! += amounts[index]!;
      visit(index + 1, sums);
      sums[g]! -= amounts[index]!;
    }
    visit(index + 1, [...sums, amounts[index]!]);
  };
  visit(0, []);
  return amounts.length - most;
}

/** Deterministic pseudo-random numbers, so a failing case can be replayed. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };
}

/** Balances as they come out of real expenses: payers and shares, through computeBalances. */
function randomTrip(random: () => number, people: number): Map<string, number> {
  const ids = Array.from({ length: people }, (_, i) => `p${i}`);
  const expenses = Array.from({ length: 1 + Math.floor(random() * 8) }, () => {
    const amountMinor = random() < 0.4 ? 1000 * (1 + Math.floor(random() * 10)) : 1 + Math.floor(random() * 50_000);
    const sharing = ids.filter(() => random() < 0.7);
    return {
      payerId: ids[Math.floor(random() * people)]!,
      amountMinor,
      shares: splitEqually(amountMinor, sharing.length ? sharing : [ids[0]!]),
    };
  });
  const balances = computeBalances(expenses);
  for (const id of ids) if (!balances.has(id)) balances.set(id, 0);
  return balances;
}

describe('suggestTransfers', () => {
  // Balances from the "Soldes" mockup.
  const mockup = new Map([
    ['jordan', -2450],
    ['lea', 4250],
    ['thomas', 3120],
    ['camille', 0],
    ['hugo', -3120],
    ['ines', -1800],
  ]);

  it('squares everyone in the fewest transfers', () => {
    const transfers = suggestTransfers(mockup);
    expect([...applyTransfers(mockup, transfers).values()].every((v) => v === 0)).toBe(true);
    // Hugo owes exactly what Thomas is owed: one transfer between them, two to Léa.
    expect(transfers).toHaveLength(3);
    expect(transfers).toContainEqual({ fromId: 'hugo', toId: 'thomas', amountMinor: 3120 });
  });

  it('settles without anyone both paying and receiving', () => {
    const transfers = suggestTransfers(mockup);
    const payers = new Set(transfers.map((t) => t.fromId));
    expect(transfers.some((t) => payers.has(t.toId))).toBe(false);
  });

  it('is deterministic', () => {
    const balances = new Map([
      ['b', -500],
      ['a', -500],
      ['c', 1000],
    ]);
    expect(suggestTransfers(balances)).toEqual(suggestTransfers(new Map([...balances].reverse())));
  });

  it('suggests nothing when everyone is square', () => {
    expect(suggestTransfers(new Map([['a', 0], ['b', 0]]))).toEqual([]);
    expect(minTransferCount(new Map())).toBe(0);
  });

  it('matches the brute-force minimum on 2 000 random trips', () => {
    const random = seeded(7);
    for (let run = 0; run < 2000; run++) {
      const balances = randomTrip(random, 2 + Math.floor(random() * 7));
      const transfers = suggestTransfers(balances);
      const after = applyTransfers(balances, transfers);
      expect([...after.values()].every((v) => v === 0)).toBe(true);
      expect(transfers.every((t) => Number.isSafeInteger(t.amountMinor) && t.amountMinor > 0)).toBe(true);
      expect(transfers.length).toBe(bruteForceMinimum(balances));
      expect(minTransferCount(balances)).toBe(transfers.length);
      expect(isBestTransferPlan(balances, transfers)).toBe(true);
    }
  });

  it('still squares everyone beyond the exact search (17+ people)', () => {
    const random = seeded(42);
    for (let run = 0; run < 20; run++) {
      const balances = randomTrip(random, 20);
      const transfers = suggestTransfers(balances);
      expect([...applyTransfers(balances, transfers).values()].every((v) => v === 0)).toBe(true);
      expect(transfers.length).toBeLessThan(20);
    }
  });
});

describe('transferPlans', () => {
  it('offers other plans, all valid and as short as the suggestion', () => {
    const balances = new Map([
      ['a', -3000],
      ['b', -3000],
      ['c', 2000],
      ['d', 4000],
    ]);
    const plans = transferPlans(balances);
    expect(plans[0]).toEqual(suggestTransfers(balances));
    expect(plans.length).toBeGreaterThan(1);
    for (const plan of plans) expect(isBestTransferPlan(balances, plan)).toBe(true);
    const keys = plans.map((plan) => JSON.stringify([...plan].sort((x, y) => (x.fromId + x.toId < y.fromId + y.toId ? -1 : 1))));
    expect(new Set(keys).size).toBe(plans.length);
  });

  it('has a single plan when there is only one way', () => {
    expect(transferPlans(new Map([['a', -500], ['b', 500]]))).toHaveLength(1);
  });

  it('only returns best plans on random trips', () => {
    const random = seeded(3);
    for (let run = 0; run < 300; run++) {
      const balances = randomTrip(random, 2 + Math.floor(random() * 7));
      const plans = transferPlans(balances);
      expect(plans.length).toBeGreaterThan(0);
      for (const plan of plans) expect(isBestTransferPlan(balances, plan)).toBe(true);
    }
  });
});

describe('isBestTransferPlan', () => {
  const balances = new Map([
    ['a', -1000],
    ['b', 600],
    ['c', 400],
  ]);

  it('accepts a plan that squares everyone in the fewest transfers', () => {
    expect(
      isBestTransferPlan(balances, [
        { fromId: 'a', toId: 'b', amountMinor: 600 },
        { fromId: 'a', toId: 'c', amountMinor: 400 },
      ]),
    ).toBe(true);
  });

  it('refuses a plan once the balances have moved, or a longer one', () => {
    expect(isBestTransferPlan(balances, [{ fromId: 'a', toId: 'b', amountMinor: 1000 }])).toBe(false);
    expect(
      isBestTransferPlan(balances, [
        { fromId: 'a', toId: 'b', amountMinor: 300 },
        { fromId: 'a', toId: 'b', amountMinor: 300 },
        { fromId: 'a', toId: 'c', amountMinor: 400 },
      ]),
    ).toBe(false);
  });

  it('refuses a middleman or an unknown person', () => {
    expect(
      isBestTransferPlan(balances, [
        { fromId: 'a', toId: 'b', amountMinor: 1000 },
        { fromId: 'b', toId: 'c', amountMinor: 400 },
      ]),
    ).toBe(false);
    expect(
      isBestTransferPlan(balances, [
        { fromId: 'a', toId: 'b', amountMinor: 600 },
        { fromId: 'a', toId: 'z', amountMinor: 400 },
      ]),
    ).toBe(false);
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
