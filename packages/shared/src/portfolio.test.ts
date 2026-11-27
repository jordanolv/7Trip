import { portfolioOf, portfolioTripLabel } from './portfolio.js';

const trip = (id: string, startDate: string | null, endDate: string | null, destinations: string[] = []) => ({ id, startDate, endDate, destinations });

describe('portfolioOf', () => {
  const today = '2026-11-07';

  it('keeps only the trips that are over, most recent first', () => {
    const portfolio = portfolioOf(
      [
        trip('berlin', '2026-03-10', '2026-03-14', ['Berlin']),
        trip('undated', null, null, ['Rome']),
        trip('ongoing', '2026-11-05', '2026-11-09', ['Naxos']),
        trip('upcoming', '2027-07-01', '2027-07-08', ['Split']),
        trip('lisbon', '2026-07-03', '2026-07-09', ['Lisbonne']),
        trip('ended-yesterday', '2026-11-06', null, ['Annecy']),
      ],
      today,
    );
    expect(portfolio.trips.map((t) => [t.trip.id, t.days])).toEqual([
      ['ended-yesterday', 1],
      ['lisbon', 7],
      ['berlin', 5],
    ]);
    expect(portfolio.days).toBe(13);
  });

  it('counts each destination once, in order of first visit', () => {
    const portfolio = portfolioOf(
      [
        trip('b', '2026-08-01', '2026-08-05', ['Séville', 'lisbonne ']),
        trip('a', '2026-07-01', '2026-07-05', ['Lisbonne', 'Porto']),
      ],
      today,
    );
    expect(portfolio.destinations).toEqual(['Lisbonne', 'Porto', 'Séville']);
  });

  it('is empty without a finished trip', () => {
    expect(portfolioOf([trip('x', null, null)], today)).toEqual({ trips: [], destinations: [], days: 0 });
  });
});

describe('portfolioTripLabel', () => {
  it('gives the month and the length', () => {
    expect(portfolioTripLabel('2026-07-03', 7)).toBe('Juil. 2026 · 7 jours');
    expect(portfolioTripLabel('2026-03-10', 1)).toBe('Mars 2026 · 1 jour');
  });
});
