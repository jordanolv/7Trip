/**
 * Money is always handled as integer minor units (cents) in the trip's base currency.
 * See docs/architecture.md §6.
 */

export type ParticipantId = string;

export interface ExpenseShare {
  participantId: ParticipantId;
  amountMinor: number;
}

export interface ExpenseForBalance {
  payerId: ParticipantId;
  amountMinor: number;
  shares: ExpenseShare[];
}

export interface SettlementForBalance {
  fromId: ParticipantId;
  toId: ParticipantId;
  amountMinor: number;
}

export interface Transfer {
  fromId: ParticipantId;
  toId: ParticipantId;
  amountMinor: number;
}

function assertMinor(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer amount of minor units, got ${value}`);
  }
}

/**
 * Splits `totalMinor` equally between participants. Leftover cents go one by one to the first
 * participants, in the order given, so the shares always add up to the total.
 */
export function splitEqually(totalMinor: number, participantIds: ParticipantId[]): ExpenseShare[] {
  assertMinor(totalMinor, 'totalMinor');
  if (participantIds.length === 0) {
    throw new RangeError('An expense must be shared with at least one participant');
  }
  if (new Set(participantIds).size !== participantIds.length) {
    throw new RangeError('Participants must be unique');
  }
  const base = Math.floor(totalMinor / participantIds.length);
  const remainder = totalMinor % participantIds.length;
  return participantIds.map((participantId, index) => ({
    participantId,
    amountMinor: base + (index < remainder ? 1 : 0),
  }));
}

/**
 * Balance per participant: what they advanced, minus what they actually consumed, plus the
 * reimbursements they paid, minus the reimbursements they received. Positive means the group
 * owes them money. The sum of all balances is always zero.
 */
export function computeBalances(
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[] = [],
): Map<ParticipantId, number> {
  const balances = new Map<ParticipantId, number>();
  const add = (id: ParticipantId, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);

  for (const expense of expenses) {
    assertMinor(expense.amountMinor, 'expense.amountMinor');
    const sharesTotal = expense.shares.reduce((sum, share) => {
      assertMinor(share.amountMinor, 'share.amountMinor');
      return sum + share.amountMinor;
    }, 0);
    if (sharesTotal !== expense.amountMinor) {
      throw new RangeError(
        `Shares (${sharesTotal}) must add up to the expense amount (${expense.amountMinor})`,
      );
    }
    add(expense.payerId, expense.amountMinor);
    for (const share of expense.shares) add(share.participantId, -share.amountMinor);
  }

  for (const settlement of settlements) {
    assertMinor(settlement.amountMinor, 'settlement.amountMinor');
    add(settlement.fromId, settlement.amountMinor);
    add(settlement.toId, -settlement.amountMinor);
  }

  return balances;
}

type Entry = [ParticipantId, number];

const byId = (a: Entry, b: Entry) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const byAmountThenId = (a: Entry, b: Entry) => b[1] - a[1] || byId(a, b);

/** Non-zero balances, in id order so that every result below is deterministic. */
const nonZero = (balances: Map<ParticipantId, number>): Entry[] =>
  [...balances].filter(([, amount]) => amount !== 0).sort(byId);

/** Above this many people with a balance, the exact search is skipped (2^n subsets). */
const EXACT_LIMIT = 16;

/**
 * The people split into as many groups as possible that each add up to zero. A group of m people
 * settles in m − 1 transfers and never fewer, so the most groups gives the fewest transfers:
 * n − groups. Dynamic programming over subsets: best[mask] is the most zero-sum groups the people
 * of `mask` can be cut into. Null above EXACT_LIMIT people.
 */
function zeroSumGroups(entries: Entry[]): Entry[][] | null {
  const n = entries.length;
  if (n > EXACT_LIMIT) return null;
  if (n === 0) return [];
  const size = 1 << n;
  const sum = new Float64Array(size);
  const best = new Int8Array(size);
  const removed = new Int8Array(size);
  for (let mask = 1; mask < size; mask++) {
    const low = 31 - Math.clz32(mask & -mask);
    sum[mask] = sum[mask & (mask - 1)]! + entries[low]![1];
    let top = -1;
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const value = best[mask ^ (1 << i)]!;
      if (value > top) {
        top = value;
        removed[mask] = i;
      }
    }
    best[mask] = top + (sum[mask] === 0 ? 1 : 0);
  }
  // Walk back from everyone: each time the remaining people add up to zero, a group closes.
  const groups: Entry[][] = [];
  let group: Entry[] = [];
  for (let mask = size - 1; mask; ) {
    if (sum[mask] === 0 && group.length) {
      groups.push(group);
      group = [];
    }
    const i = removed[mask]!;
    group.push(entries[i]!);
    mask ^= 1 << i;
  }
  groups.push(group);
  return groups;
}

/** Largest debtor pays largest creditor, until the group is square: m − 1 transfers at most. */
function settleGreedily(entries: Entry[]): Transfer[] {
  const creditors = entries.filter(([, amount]) => amount > 0).map(([id, amount]): Entry => [id, amount]).sort(byAmountThenId);
  const debtors = entries.filter(([, amount]) => amount < 0).map(([id, amount]): Entry => [id, -amount]).sort(byAmountThenId);
  const transfers: Transfer[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const creditor = creditors[c]!;
    const debtor = debtors[d]!;
    const amountMinor = Math.min(creditor[1], debtor[1]);
    transfers.push({ fromId: debtor[0], toId: creditor[0], amountMinor });
    creditor[1] -= amountMinor;
    debtor[1] -= amountMinor;
    if (creditor[1] === 0) c++;
    if (debtor[1] === 0) d++;
  }
  return transfers;
}

/** Big groups: exact opposites first (one transfer for two people), then greedy. */
function settleApproximately(entries: Entry[]): Transfer[] {
  const left = entries.map(([id, amount]): Entry => [id, amount]);
  const transfers: Transfer[] = [];
  for (const debtor of left) {
    if (debtor[1] >= 0) continue;
    const match = left.find((creditor) => creditor[1] === -debtor[1]);
    if (!match) continue;
    transfers.push({ fromId: debtor[0], toId: match[0], amountMinor: match[1] });
    match[1] = 0;
    debtor[1] = 0;
  }
  return [...transfers, ...settleGreedily(left.filter(([, amount]) => amount !== 0))];
}

/** The fewest transfers that square everyone (exact up to EXACT_LIMIT people with a balance). */
export function minTransferCount(balances: Map<ParticipantId, number>): number {
  const entries = nonZero(balances);
  const groups = zeroSumGroups(entries);
  return groups ? entries.length - groups.length : settleApproximately(entries).length;
}

/**
 * Who should pay whom so that everyone is square, in the fewest transfers possible (CDC §8.2).
 * Each transfer goes from someone who owes money to someone who is owed money, and never for more
 * than either balance. Deterministic: the same balances always give the same suggestion.
 */
export function suggestTransfers(balances: Map<ParticipantId, number>): Transfer[] {
  const entries = nonZero(balances);
  const groups = zeroSumGroups(entries);
  return groups ? groups.flatMap(settleGreedily) : settleApproximately(entries);
}

/** Every next transfer that closes one balance in full, with the balances left after it. */
function* moves(entries: Entry[]): Generator<[Transfer, Entry[]]> {
  for (const debtor of entries) {
    if (debtor[1] >= 0) continue;
    for (const creditor of entries) {
      if (creditor[1] <= 0) continue;
      const amountMinor = Math.min(-debtor[1], creditor[1]);
      const rest = entries
        .map(([id, amount]): Entry => [id, id === debtor[0] ? amount + amountMinor : id === creditor[0] ? amount - amountMinor : amount])
        .filter(([, amount]) => amount !== 0);
      yield [{ fromId: debtor[0], toId: creditor[0], amountMinor }, rest];
    }
  }
}

const planKey = (plan: Transfer[]) =>
  plan
    .map((t) => `${t.fromId}>${t.toId}:${t.amountMinor}`)
    .sort()
    .join('|');

/**
 * Other ways to be square in the same, smallest, number of transfers ("Autre répartition"):
 * suggestTransfers first, then up to `limit` plans in all. Same rules as the suggestion. A depth-
 * first search where each step closes one person's balance in full, which every plan of that size
 * can be built from; cut as soon as the fewest transfers left can no longer reach the target.
 */
export function transferPlans(balances: Map<ParticipantId, number>, limit = 8): Transfer[][] {
  const first = suggestTransfers(balances);
  const target = first.length;
  const plans = new Map([[planKey(first), first]]);
  const exact = nonZero(balances).length <= 10;
  const fewestLeft = new Map<string, number>();
  const lowerBound = (entries: Entry[]) => {
    if (!exact) return Math.ceil(entries.length / 2);
    const key = entries.map(([id, amount]) => `${id}:${amount}`).join(',');
    let value = fewestLeft.get(key);
    if (value === undefined) {
      value = minTransferCount(new Map(entries));
      fewestLeft.set(key, value);
    }
    return value;
  };
  let budget = 4000;

  const search = (entries: Entry[], plan: Transfer[], perBranch: { left: number }) => {
    if (plans.size >= limit || perBranch.left <= 0 || budget-- <= 0) return;
    if (!entries.length) {
      const key = planKey(plan);
      if (plan.length === target && !plans.has(key)) {
        plans.set(key, plan);
        perBranch.left--;
      }
      return;
    }
    if (plan.length + lowerBound(entries) > target) return;
    for (const [transfer, rest] of moves(entries)) search(rest, [...plan, transfer], perBranch);
  };
  // Each first transfer gets its own small share of plans, so that the plans differ from the start.
  for (const [transfer, rest] of moves(nonZero(balances))) search(rest, [transfer], { left: 2 });
  return [...plans.values()];
}

/**
 * Whether `plan` squares everyone in the fewest transfers, each from someone who owes to someone
 * who is owed and never for more than they owe or are owed. Used to accept a plan chosen by the
 * group, and to drop it once the balances have moved.
 */
export function isBestTransferPlan(balances: Map<ParticipantId, number>, plan: Transfer[]): boolean {
  const left = new Map(balances);
  for (const t of plan) {
    if (!Number.isSafeInteger(t.amountMinor) || t.amountMinor <= 0 || t.fromId === t.toId) return false;
    const from = left.get(t.fromId);
    const to = left.get(t.toId);
    if (from === undefined || to === undefined || from > -t.amountMinor || to < t.amountMinor) return false;
    left.set(t.fromId, from + t.amountMinor);
    left.set(t.toId, to - t.amountMinor);
  }
  return [...left.values()].every((amount) => amount === 0) && plan.length === minTransferCount(balances);
}

/** Sum of a participant's actual shares — what counts against their personal budget. */
export function personalCost(expenses: ExpenseForBalance[], participantId: ParticipantId): number {
  return expenses.reduce(
    (sum, expense) =>
      sum +
      expense.shares
        .filter((share) => share.participantId === participantId)
        .reduce((s, share) => s + share.amountMinor, 0),
    0,
  );
}
