import { createTripRequestSchema, daysBetween, formatDestinations, tripPhase } from './trips.js';

describe('createTripRequestSchema', () => {
  it('accepts a title alone (CDC §4: destination and dates are optional)', () => {
    const parsed = createTripRequestSchema.parse({ title: '  Vacances d’été entre potes ' });
    expect(parsed).toMatchObject({ title: 'Vacances d’été entre potes', kind: 'GROUP', destinations: [] });
  });

  it('accepts several ordered destinations and rejects blank ones', () => {
    expect(createTripRequestSchema.parse({ title: 'Pologne', destinations: [' Cracovie ', 'Varsovie'] }).destinations).toEqual([
      'Cracovie',
      'Varsovie',
    ]);
    expect(createTripRequestSchema.safeParse({ title: 'Pologne', destinations: ['Cracovie', '  '] }).success).toBe(false);
    expect(createTripRequestSchema.safeParse({ title: 'Tour du monde', destinations: Array(11).fill('Ici') }).success).toBe(false);
  });

  it('rejects an end date before the start date', () => {
    const result = createTripRequestSchema.safeParse({ title: 'Annecy', startDate: '2026-11-16', endDate: '2026-11-14' });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0]!.path).toEqual(['endDate']);
  });

  it('rejects unknown colours and icons', () => {
    expect(createTripRequestSchema.safeParse({ title: 'X', color: 'pink' }).success).toBe(false);
    expect(createTripRequestSchema.safeParse({ title: 'X', icon: 'rocket' }).success).toBe(false);
  });
});

describe('tripPhase', () => {
  const today = '2026-10-20';

  it('is ongoing between the start and end dates, inclusive', () => {
    expect(tripPhase({ startDate: '2026-10-17', endDate: '2026-10-24' }, today)).toBe('ongoing');
    expect(tripPhase({ startDate: '2026-10-20', endDate: '2026-10-20' }, today)).toBe('ongoing');
  });

  it('is past after the end date and upcoming before the start date', () => {
    expect(tripPhase({ startDate: '2026-07-03', endDate: '2026-07-09' }, today)).toBe('past');
    expect(tripPhase({ startDate: '2026-11-14', endDate: '2026-11-16' }, today)).toBe('upcoming');
  });

  it('treats a trip without dates as upcoming', () => {
    expect(tripPhase({ startDate: null, endDate: null }, today)).toBe('upcoming');
  });

  it('treats a start date without end date as a one-day trip', () => {
    expect(tripPhase({ startDate: '2026-10-19', endDate: null }, today)).toBe('past');
  });
});

describe('daysBetween', () => {
  it('counts calendar days, whatever the time of day', () => {
    expect(daysBetween('2026-10-20', '2026-11-14')).toBe(25);
    expect(daysBetween('2026-10-17', '2026-10-20')).toBe(3);
  });
});

describe('formatDestinations', () => {
  it('joins up to three stops and summarises longer itineraries', () => {
    expect(formatDestinations([])).toBeNull();
    expect(formatDestinations(['Séville'])).toBe('Séville');
    expect(formatDestinations(['Cracovie', 'Varsovie', 'Gdańsk'])).toBe('Cracovie → Varsovie → Gdańsk');
    expect(formatDestinations(['Málaga', 'Grenade', 'Séville', 'Cadix'])).toBe('Málaga → Grenade + 2 étapes');
  });
});
