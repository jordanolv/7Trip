import { z } from 'zod';

/**
 * What a participant can be notified about, per trip (CDC §10.1, docs/decisions.md). Invitations
 * go through links, so there is nobody to notify before they join.
 */
export const NOTIFICATION_TOPICS = ['POLLS', 'PLANNING', 'DAILY', 'SETTLEMENTS', 'EXPENSES'] as const;
export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number];

export type NotificationPrefs = Record<NotificationTopic, boolean>;

/** Each new expense would be noise: off until asked for. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  POLLS: true,
  PLANNING: true,
  DAILY: true,
  SETTLEMENTS: true,
  EXPENSES: false,
};

/** Labels and hints of the trip settings (mockup G-Parametres). */
export const NOTIFICATION_TOPIC_LABELS: Record<NotificationTopic, { label: string; hint: string }> = {
  POLLS: { label: 'Sondages à voter', hint: 'Nouveau sondage, rappel avant clôture' },
  PLANNING: { label: 'Changements de planning', hint: 'Seulement les changements importants' },
  DAILY: { label: 'Rappels du jour', hint: 'Le matin pendant le séjour' },
  SETTLEMENTS: { label: 'Remboursements', hint: 'Quand tu dois ou on te doit de l’argent' },
  EXPENSES: { label: 'Chaque nouvelle dépense', hint: 'Désactivé par défaut pour éviter le bruit' },
};

/** The stored preferences over the defaults: a topic added later starts at its default. */
export function resolveNotificationPrefs(stored: unknown): NotificationPrefs {
  const parsed = notificationPrefsRequestSchema.safeParse(stored);
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(parsed.success ? parsed.data : {}) };
}

/** Only the topics sent change. */
export const notificationPrefsRequestSchema = z.partialRecord(z.enum(NOTIFICATION_TOPICS), z.boolean());

/** The morning reminder during the trip, at this hour on the phone's clock. */
export const DAILY_REMINDER_HOUR = 8;

/** A phone that receives the notifications of the signed-in account (Expo push token). */
export const pushTokenRequestSchema = z.object({
  token: z.string().regex(/^(Exponent|Expo)PushToken\[.+\]$/, 'Jeton de notification invalide'),
  /** IANA zone of the phone, for the morning reminder ("Europe/Paris"). */
  timeZone: z
    .string()
    .max(64)
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat('fr-FR', { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, 'Fuseau horaire inconnu'),
});
export type PushTokenRequest = z.infer<typeof pushTokenRequestSchema>;

export const removePushTokenRequestSchema = pushTokenRequestSchema.pick({ token: true });

/** Sent with each notification: the screen of the app it opens. */
export interface NotificationData {
  url: string;
}

/** The day ("2026-07-14") and hour it is at `now` in `timeZone`. */
export function zonedDayAndHour(now: Date, timeZone: string): { day: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}
