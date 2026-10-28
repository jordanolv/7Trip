import {
  canEditEvent,
  createEventRequestSchema,
  eventCategoryForIdea,
  findOverlaps,
  overlapMessage,
  planningDays,
  scheduleError,
  tripRangeError,
  weekdayShort,
} from './events.js';

const event = (id: string, startTime: string | null, endTime: string | null, participantIds: string[] = [], extra = {}) => ({
  id,
  startDate: '2026-10-20',
  endDate: null,
  startTime,
  endTime,
  participantIds,
  ...extra,
});

describe('createEventRequestSchema', () => {
  it('needs a title and a date; times, place and participants are optional', () => {
    const parsed = createEventRequestSchema.parse({ title: ' Tapas ', startDate: '2026-10-20', place: '' });
    expect(parsed).toMatchObject({ title: 'Tapas', category: 'ACTIVITY', place: null, participantIds: [] });
    expect(createEventRequestSchema.safeParse({ title: 'Tapas' }).success).toBe(false);
  });

  it('refuses an impossible schedule', () => {
    const issue = (body: object) => createEventRequestSchema.safeParse({ title: 'x', startDate: '2026-10-20', ...body }).error?.issues[0];
    expect(issue({ startTime: '18:00', endTime: '17:00' })).toMatchObject({ path: ['endTime'] });
    expect(issue({ endTime: '17:00' })).toMatchObject({ path: ['endTime'] });
    expect(issue({ endDate: '2026-10-19' })).toMatchObject({ path: ['endDate'] });
    expect(issue({ startTime: '25:00' })).toMatchObject({ path: ['startTime'] });
    // Across days, an earlier end time is fine (an overnight train).
    expect(issue({ endDate: '2026-10-21', startTime: '22:00', endTime: '07:00' })).toBeUndefined();
  });
});

describe('scheduleError', () => {
  it('accepts a date alone', () => {
    expect(scheduleError({ startDate: '2026-10-20' })).toBeNull();
  });
});

describe('tripRangeError', () => {
  const trip = { startDate: '2026-10-17', endDate: '2026-10-24' };
  it('keeps events within the trip dates, when there are some', () => {
    expect(tripRangeError({ startDate: '2026-10-17', endDate: '2026-10-24' }, trip)).toBeNull();
    expect(tripRangeError({ startDate: '2026-10-16' }, trip)).toEqual({ field: 'startDate', message: 'Le voyage commence le 17 oct.' });
    expect(tripRangeError({ startDate: '2026-10-25' }, trip)).toEqual({ field: 'startDate', message: 'Le voyage se termine le 24 oct.' });
    expect(tripRangeError({ startDate: '2026-10-23', endDate: '2026-10-26' }, trip)).toMatchObject({ field: 'endDate' });
    expect(tripRangeError({ startDate: '2026-10-17' }, { startDate: '2026-10-17', endDate: null })).toBeNull();
    expect(tripRangeError({ startDate: '2030-01-01' }, { startDate: null, endDate: null })).toBeNull();
  });
});

describe('canEditEvent', () => {
  it('lets the author, the organizers and the people taking part edit', () => {
    const lea = { id: 'lea', role: 'PARTICIPANT' as const };
    expect(canEditEvent(lea, { authorId: 'tom', participantIds: ['tom'] })).toBe(false);
    expect(canEditEvent(lea, { authorId: 'tom', participantIds: ['tom', 'lea'] })).toBe(true);
    expect(canEditEvent(lea, { authorId: 'tom', participantIds: [] })).toBe(true);
    expect(canEditEvent(lea, { authorId: 'lea', participantIds: ['tom'] })).toBe(true);
    expect(canEditEvent({ id: 'jo', role: 'ORGANIZER' }, { authorId: 'tom', participantIds: ['tom'] })).toBe(true);
  });
});

describe('findOverlaps', () => {
  const everyone = ['lea', 'tom', 'cam'];

  it('flags two timed events of the same day sharing someone, with the shared slot', () => {
    const tapas = event('tapas', '18:00', '19:30', ['lea', 'tom']);
    const flamenco = event('flamenco', '19:00', '21:00', ['lea', 'cam']);
    expect(findOverlaps([flamenco, tapas], everyone)).toEqual([
      { first: tapas, second: flamenco, participantIds: ['lea'], from: '19:00', to: '19:30' },
    ]);
  });

  it('counts the whole group for an event without participants, and one hour without an end', () => {
    const lunch = event('lunch', '13:30', null);
    const museum = event('museum', '14:00', '16:00', ['tom']);
    expect(findOverlaps([lunch, museum], everyone)).toMatchObject([{ participantIds: ['tom'], from: '14:00', to: '14:30' }]);
  });

  it('ignores back-to-back events, other people, other days, untimed and multi-day events', () => {
    expect(findOverlaps([event('a', '10:00', '12:00'), event('b', '12:00', '13:00')], everyone)).toEqual([]);
    expect(findOverlaps([event('a', '10:00', '12:00', ['lea']), event('b', '11:00', '13:00', ['tom'])], everyone)).toEqual([]);
    expect(findOverlaps([event('a', '10:00', '12:00'), event('b', '11:00', null, [], { startDate: '2026-10-21' })], everyone)).toEqual([]);
    expect(findOverlaps([event('a', null, null), event('b', '11:00', null)], everyone)).toEqual([]);
    expect(findOverlaps([event('hotel', '15:00', null, [], { endDate: '2026-10-22' }), event('b', '15:30', null)], everyone)).toEqual([]);
  });
});

describe('overlapMessage', () => {
  it('names who is on both', () => {
    expect(overlapMessage(['Léa'], false, '19:00', '19:30')).toBe('Léa est sur les deux entre 19:00 et 19:30.');
    expect(overlapMessage(['Léa', 'Tom', 'Cam'], false, '19:00', '19:30')).toBe('Léa, Tom et Cam sont sur les deux entre 19:00 et 19:30.');
    expect(overlapMessage([], true, '19:00', '19:30')).toBe('Tout le groupe est sur les deux entre 19:00 et 19:30.');
  });
});

describe('planningDays', () => {
  it('lists the trip days, plus event days outside them', () => {
    const days = planningDays({ startDate: '2026-10-30', endDate: '2026-11-01' }, [
      { startDate: '2026-11-03', endDate: null },
      { startDate: '2026-10-31', endDate: null },
    ]);
    expect(days).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03']);
    expect(planningDays({ startDate: null, endDate: null }, [{ startDate: '2026-10-20', endDate: '2026-10-21' }])).toEqual([
      '2026-10-20',
      '2026-10-21',
    ]);
    expect(weekdayShort('2026-10-20')).toBe('mar');
    // A long trip offers all its days, up to its last one.
    expect(planningDays({ startDate: '2027-01-01', endDate: '2027-03-31' }, []).at(-1)).toBe('2027-03-31');
  });
});

describe('eventCategoryForIdea', () => {
  it('maps idea kinds to planning categories', () => {
    expect(eventCategoryForIdea('FOOD')).toBe('FOOD');
    expect(eventCategoryForIdea('BEACH')).toBe('ACTIVITY');
    expect(eventCategoryForIdea(null)).toBe('OTHER');
  });
});
