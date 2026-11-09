import { describe, expect, it } from 'vitest';
import { distanceMeters, formatDistance, placeIdSchema, placeSearchQuerySchema } from './places.js';

describe('places', () => {
  it('takes Google place ids and nothing that could break a URL', () => {
    expect(placeIdSchema.parse(' ChIJD7G2bqduEg0ROdrTdOj1Jok ')).toBe('ChIJD7G2bqduEg0ROdrTdOj1Jok');
    expect(placeIdSchema.safeParse('abc/../x').success).toBe(false);
    expect(placeIdSchema.safeParse('').success).toBe(false);
  });

  it('searches from 2 letters, within one session', () => {
    expect(placeSearchQuerySchema.safeParse({ q: 'P', session: '0195f3a0-0000-7000-8000-000000000000' }).success).toBe(false);
    expect(placeSearchQuerySchema.safeParse({ q: 'Plaza', session: 'nope' }).success).toBe(false);
  });

  it('measures and writes distances the French way', () => {
    const alcazar = { lat: 37.3831, lng: -5.9902 };
    const plaza = { lat: 37.3772, lng: -5.9869 };
    expect(Math.round(distanceMeters(alcazar, plaza))).toBeGreaterThan(700);
    expect(Math.round(distanceMeters(alcazar, plaza))).toBeLessThan(750);
    expect(formatDistance(4)).toBe('10 m');
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(2930)).toBe('2,9 km');
    expect(formatDistance(3000)).toBe('3 km');
    expect(formatDistance(98_400)).toBe('98 km');
  });
});
