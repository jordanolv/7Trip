import { formatRelativeTime } from './format.js';
import { canEditContent, createIdeaRequestSchema, ideaMapsUrl, updateIdeaRequestSchema } from './ideas.js';

describe('createIdeaRequestSchema', () => {
  it('accepts a title alone (CDC §5: everything else is optional)', () => {
    expect(createIdeaRequestSchema.parse({ title: '  Visite de l’Alcázar ' })).toEqual({ title: 'Visite de l’Alcázar' });
    expect(createIdeaRequestSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('turns blank optional fields into null', () => {
    const parsed = createIdeaRequestSchema.parse({ title: 'Plage de Bolonia', place: '  ', cost: ' Gratuit ', url: '' });
    expect(parsed).toMatchObject({ place: null, cost: 'Gratuit', url: null });
  });

  it('accepts a link without its scheme and rejects what is not a web link', () => {
    expect(createIdeaRequestSchema.parse({ title: 'Alcázar', url: 'www.alcazarsevilla.org/visite' }).url).toBe(
      'https://www.alcazarsevilla.org/visite',
    );
    expect(createIdeaRequestSchema.parse({ title: 'Alcázar', url: 'http://alcazarsevilla.org' }).url).toBe('http://alcazarsevilla.org');
    expect(createIdeaRequestSchema.safeParse({ title: 'Alcázar', url: 'pas un lien' }).success).toBe(false);
    expect(createIdeaRequestSchema.safeParse({ title: 'Alcázar', url: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('only knows the listed categories', () => {
    expect(createIdeaRequestSchema.parse({ title: 'Tapas', category: 'FOOD' }).category).toBe('FOOD');
    expect(createIdeaRequestSchema.safeParse({ title: 'Tapas', category: 'BAR' }).success).toBe(false);
  });
});

describe('updateIdeaRequestSchema', () => {
  it('accepts a status change alone, with the version it was made on', () => {
    expect(updateIdeaRequestSchema.parse({ status: 'KEPT', version: 3 })).toEqual({ status: 'KEPT', version: 3 });
    expect(updateIdeaRequestSchema.safeParse({ status: 'PLANNED' }).success).toBe(false);
  });
});

describe('ideaMapsUrl', () => {
  it('uses the idea’s own Google Maps link, else searches its place', () => {
    expect(ideaMapsUrl({ place: 'Séville', url: 'https://maps.app.goo.gl/abc123' })).toBe('https://maps.app.goo.gl/abc123');
    expect(ideaMapsUrl({ place: null, url: 'https://www.google.fr/maps/place/Alcázar' })).toBe('https://www.google.fr/maps/place/Alcázar');
    expect(ideaMapsUrl({ place: 'Plaza de España', url: 'https://www.alcazarsevilla.org' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=Plaza%20de%20Espa%C3%B1a',
    );
    expect(ideaMapsUrl({ place: null, url: 'https://www.alcazarsevilla.org' })).toBeNull();
  });
});

describe('canEditContent', () => {
  it('lets organizers edit everything and others only their own items', () => {
    expect(canEditContent({ id: 'a', role: 'ORGANIZER' }, 'b')).toBe(true);
    expect(canEditContent({ id: 'a', role: 'PARTICIPANT' }, 'a')).toBe(true);
    expect(canEditContent({ id: 'a', role: 'PARTICIPANT' }, 'b')).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  it('counts minutes, hours and days, then shows the date', () => {
    expect(formatRelativeTime('2026-10-28T11:59:40Z', now)).toBe('à l’instant');
    expect(formatRelativeTime('2026-10-28T11:55:00Z', now)).toBe('il y a 5 min');
    expect(formatRelativeTime('2026-10-28T09:00:00Z', now)).toBe('il y a 3 h');
    expect(formatRelativeTime('2026-10-26T10:00:00Z', now)).toBe('il y a 2 j');
    expect(formatRelativeTime('2026-10-01T10:00:00Z', now)).toBe('1 oct.');
    expect(formatRelativeTime('2025-10-01T10:00:00Z', now)).toBe('1 oct. 2025');
  });
});
