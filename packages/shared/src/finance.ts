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

/**
 * Suggests who should pay whom to settle every balance, with at most n − 1 transfers.
 * Greedy: the largest debtor pays the largest creditor. Ties are broken by participant id so the
 * result is deterministic.
 */
export function suggestTransfers(balances: Map<ParticipantId, number>): Transfer[] {
  const byAmountThenId = (a: [ParticipantId, number], b: [ParticipantId, number]) =>
    b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

  const creditors = [...balances].filter(([, amount]) => amount > 0).sort(byAmountThenId);
  const debtors = [...balances]
    .filter(([, amount]) => amount < 0)
    .map(([id, amount]): [ParticipantId, number] => [id, -amount])
    .sort(byAmountThenId);

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
