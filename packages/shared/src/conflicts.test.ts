import { describe, expect, it } from 'vitest';

import { EVENT_CONFLICT_GROUPS, chooseVersion, mergeEdits } from './conflicts.js';

const event = {
  title: 'Visite de l’Alcázar',
  category: 'ACTIVITY',
  startDate: '2027-10-20',
  endDate: null as string | null,
  startTime: '10:00' as string | null,
  endTime: '12:00' as string | null,
  place: 'Patio de Banderas',
  url: null as string | null,
  bookingRef: null as string | null,
  description: null as string | null,
  participantIds: [] as string[],
};

describe('mergeEdits', () => {
  it('keeps the changes of both sides when they touch different fields', () => {
    const mine = { ...event, description: 'Prendre les billets imprimés' };
    const theirs = { ...event, place: 'Real Alcázar' };
    const result = mergeEdits(event, mine, theirs, EVENT_CONFLICT_GROUPS);
    expect(result.conflicts).toEqual([]);
    expect(result.keptMine).toEqual(['Description']);
    expect(result.keptTheirs).toEqual(['Lieu']);
    expect(result.merged).toMatchObject({ description: 'Prendre les billets imprimés', place: 'Real Alcázar' });
  });

  it('asks only where both changed the same group differently (the mockup)', () => {
    const mine = { ...event, startTime: '10:00', endTime: '12:00', description: 'Billets imprimés', startDate: '2027-10-20' };
    const theirs = { ...event, startTime: '10:30', endTime: '12:30' };
    const both = { ...mine, startTime: '09:30' };
    const result = mergeEdits(event, both, theirs, EVENT_CONFLICT_GROUPS);
    expect(result.conflicts).toEqual(['Horaire']);
    expect(result.keptMine).toEqual(['Description']);
    // Theirs until chosen.
    expect(result.merged).toMatchObject({ startTime: '10:30', endTime: '12:30', description: 'Billets imprimés' });
    expect(chooseVersion(result.merged, both, EVENT_CONFLICT_GROUPS.Horaire)).toMatchObject({ startTime: '09:30', endTime: '12:00' });
  });

  it('sees no conflict when both made the same change', () => {
    const mine = { ...event, title: 'Alcázar', participantIds: ['a', 'b'] };
    const theirs = { ...event, title: 'Alcázar', participantIds: ['a', 'b'] };
    expect(mergeEdits(event, mine, theirs, EVENT_CONFLICT_GROUPS).conflicts).toEqual([]);
  });
});
