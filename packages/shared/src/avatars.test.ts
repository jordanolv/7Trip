import { describe, expect, it } from 'vitest';

import { AVATAR_COLORS, defaultAvatarColor, participantAvatarColor } from './avatars.js';

describe('defaultAvatarColor', () => {
  it('is stable for a seed and spreads seeds over the palette', () => {
    const seed = '01a1841b-c725-767a-9726-85f442b2cbe0';
    expect(defaultAvatarColor(seed)).toBe(defaultAvatarColor(seed));
    const used = new Set(Array.from({ length: 64 }, (_, i) => defaultAvatarColor(`01a1841b-c725-767a-9726-85f442b2c${i.toString().padStart(3, '0')}`)));
    expect(used.size).toBeGreaterThan(AVATAR_COLORS.length / 2);
  });
});

describe('participantAvatarColor', () => {
  it('prefers the chosen colour, then the account, then the guest participant', () => {
    expect(participantAvatarColor({ id: 'p', userId: 'u', avatarColor: 'rose' })).toBe('rose');
    expect(participantAvatarColor({ id: 'p', userId: 'u', avatarColor: null })).toBe(defaultAvatarColor('u'));
    expect(participantAvatarColor({ id: 'p', userId: null, avatarColor: null })).toBe(defaultAvatarColor('p'));
  });
});
