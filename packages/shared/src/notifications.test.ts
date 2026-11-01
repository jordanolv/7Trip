import { describe, expect, it } from 'vitest';

import { DEFAULT_NOTIFICATION_PREFS, pushTokenRequestSchema, resolveNotificationPrefs, zonedDayAndHour } from './notifications.js';

describe('resolveNotificationPrefs', () => {
  it('starts from the defaults, new expenses off', () => {
    expect(resolveNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(DEFAULT_NOTIFICATION_PREFS.EXPENSES).toBe(false);
  });

  it('keeps the stored choices and ignores what it does not know', () => {
    expect(resolveNotificationPrefs({ POLLS: false, EXPENSES: true })).toEqual({ ...DEFAULT_NOTIFICATION_PREFS, POLLS: false, EXPENSES: true });
    expect(resolveNotificationPrefs({ POLLS: 'no' })).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });
});

describe('pushTokenRequestSchema', () => {
  it('takes an Expo token and a known zone', () => {
    expect(pushTokenRequestSchema.safeParse({ token: 'ExponentPushToken[abc]', timeZone: 'Europe/Paris' }).success).toBe(true);
    expect(pushTokenRequestSchema.safeParse({ token: 'abc', timeZone: 'Europe/Paris' }).success).toBe(false);
    expect(pushTokenRequestSchema.safeParse({ token: 'ExponentPushToken[abc]', timeZone: 'Mars/Olympus' }).success).toBe(false);
  });
});

describe('zonedDayAndHour', () => {
  it('reads the day and hour on the phone’s clock', () => {
    const now = new Date('2026-07-14T22:30:00Z');
    expect(zonedDayAndHour(now, 'Europe/Paris')).toEqual({ day: '2026-07-15', hour: 0 });
    expect(zonedDayAndHour(now, 'America/New_York')).toEqual({ day: '2026-07-14', hour: 18 });
  });
});
