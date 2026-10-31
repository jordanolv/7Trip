import { describe, expect, it } from 'vitest';

import { eventsOfDay, isHappening, nextEvents } from './dashboard.js';

const event = (title: string, startDate: string, startTime: string | null = null, endTime: string | null = null, endDate: string | null = null) => ({
  title,
  startDate,
  endDate,
  startTime,
  endTime,
});

const day = '2027-10-20';
const alcazar = event('Alcázar', day, '10:00', '12:00');
const lunch = event('Eslava', day, '13:30');
const flamenco = event('Flamenco', day, '20:00', '22:00');
const hotel = event('Hôtel', '2027-10-19', null, null, '2027-10-22');
const tomorrow = event('Cordoue', '2027-10-21', '09:00');

describe('dashboard', () => {
  it('lists the day in timeline order, stays included', () => {
    expect(eventsOfDay([flamenco, tomorrow, lunch, hotel, alcazar], day).map((e) => e.title)).toEqual(['Hôtel', 'Alcázar', 'Eslava', 'Flamenco']);
  });

  it('says what is happening now', () => {
    expect(isHappening(alcazar, day, '10:00')).toBe(true);
    expect(isHappening(alcazar, day, '12:00')).toBe(false);
    // An hour without an end time.
    expect(isHappening(lunch, day, '14:15')).toBe(true);
    expect(isHappening(lunch, day, '14:30')).toBe(false);
    expect(isHappening(hotel, day, '10:00')).toBe(false);
  });

  it('shows what comes next, from now on', () => {
    expect(nextEvents([tomorrow, flamenco, lunch, alcazar], day, '11:00', 2).map((e) => e.title)).toEqual(['Eslava', 'Flamenco']);
    expect(nextEvents([tomorrow, flamenco], day, '23:00', 3).map((e) => e.title)).toEqual(['Cordoue']);
  });
});
