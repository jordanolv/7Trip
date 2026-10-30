/**
 * Two people edited the same item (docs/architecture.md, conflits; mockup G-Conflit). Each group of
 * fields is compared with the version both started from: changed by one side only, that change is
 * kept; changed by both, differently, the person saving chooses.
 */
export interface MergeResult<T> {
  /** Every field, with the changes of both sides where they do not collide. */
  merged: T;
  /** Groups both changed differently: still theirs in `merged`, until chosen. */
  conflicts: string[];
  /** Groups only the person saving changed: kept. */
  keptMine: string[];
  /** Groups only the other person changed: kept too. */
  keptTheirs: string[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function mergeEdits<T extends object>(base: T, mine: T, theirs: T, groups: Record<string, readonly (keyof T)[]>): MergeResult<T> {
  const merged = { ...theirs };
  const result: MergeResult<T> = { merged, conflicts: [], keptMine: [], keptTheirs: [] };
  for (const [group, fields] of Object.entries(groups)) {
    const pick = (from: T) => fields.map((field) => from[field]);
    const mineChanged = !same(pick(mine), pick(base));
    const theirsChanged = !same(pick(theirs), pick(base));
    if (mineChanged && !theirsChanged) {
      for (const field of fields) merged[field] = mine[field];
      result.keptMine.push(group);
    } else if (theirsChanged && !mineChanged) {
      result.keptTheirs.push(group);
    } else if (mineChanged && theirsChanged && !same(pick(mine), pick(theirs))) {
      result.conflicts.push(group);
    }
  }
  return result;
}

/** Applies a choice made for a conflicting group. */
export function chooseVersion<T extends object>(merged: T, from: T, fields: readonly (keyof T)[]): T {
  const next = { ...merged };
  for (const field of fields) next[field] = from[field];
  return next;
}

/** An event's fields as the conflict screen groups and names them. */
export const EVENT_CONFLICT_GROUPS = {
  Titre: ['title'],
  Catégorie: ['category'],
  Dates: ['startDate', 'endDate'],
  Horaire: ['startTime', 'endTime'],
  Lieu: ['place'],
  Lien: ['url'],
  Réservation: ['bookingRef'],
  Description: ['description'],
  Participants: ['participantIds'],
} as const;
