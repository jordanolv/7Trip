import {
  eventsOfDay,
  formatMoney,
  formatTimeRange,
  isHappening,
  localIsoDate,
  localTime,
  nextEvents,
  weekdayShort,
  formatDayMonth,
  type PersonalBudgetView,
  type SuggestedTransfer,
  type TripBalances,
  type TripDocument,
  type TripEvent,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { EventIcon, eventStyle } from '@/events/event-visuals';

/**
 * The local day and time, kept current while the screen stays open: "Maintenant" and "À venir"
 * follow the clock without a refresh.
 */
export function useClock(): { today: string; now: string } {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return { today: localIsoDate(date), now: localTime(date) };
}

/**
 * The blocks of the dashboard (CDC §3.2, mockup G-Dashboard). Each returns nothing when it has
 * nothing useful to show: no empty blocks.
 */

function CardHeader({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <View style={styles.header}>
      <AppText variant="heading" style={styles.flex}>
        {title}
      </AppText>
      {link && onLink ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onLink}>
          <Text style={styles.link}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** During the trip: the day's planning, what is happening now first. */
export function TodayCard({ tripId, events, documents, today, now }: { tripId: string; events: TripEvent[]; documents: TripDocument[]; today: string; now: string }) {
  const ofDay = eventsOfDay(events, today);
  if (!ofDay.length) return null;
  const open = (event: TripEvent) => router.push(`/voyage/${tripId}/evenement/${event.id}` as Href);
  const current = ofDay.find((event) => isHappening(event, today, now));
  const others = ofDay.filter((event) => event !== current);
  const docsOf = (event: TripEvent) => documents.filter((doc) => doc.event?.id === event.id).length;

  return (
    <View style={styles.card}>
      <CardHeader title="Aujourd’hui" link="Planning" onLink={() => router.navigate(`/voyage/${tripId}/planning` as Href)} />
      {current ? (
        <Pressable accessibilityRole="button" onPress={() => open(current)} style={[styles.now, { backgroundColor: eventStyle(current.category).tint }]}>
          <EventIcon category={current.category} size={22} color={eventStyle(current.category).ink} />
          <View style={styles.flex}>
            <Text style={[styles.nowLabel, { color: eventStyle(current.category).ink }]}>MAINTENANT · {formatTimeRange(current)}</Text>
            <AppText variant="bodyStrong" numberOfLines={2}>
              {current.title}
            </AppText>
            {docsOf(current) ? (
              <AppText variant="caption" tone="secondary">
                {docsOf(current) === 1 ? '1 document' : `${docsOf(current)} documents`} dans Documents
              </AppText>
            ) : null}
          </View>
        </Pressable>
      ) : null}
      {others.map((event) => (
        <Pressable key={event.id} accessibilityRole="button" onPress={() => open(event)} style={styles.line}>
          <Text style={styles.time}>{event.startTime && event.startDate === today ? event.startTime : 'Journée'}</Text>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {event.title}
          </AppText>
          {docsOf(event) ? <Icon name="folder" color={colors.inkSecondary} size={16} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** Before the trip, or a day with nothing planned: what comes next. */
export function NextCard({ tripId, events, today, now }: { tripId: string; events: TripEvent[]; today: string; now: string }) {
  const next = nextEvents(events, today, now, 3);
  if (!next.length) return null;
  return (
    <View style={styles.card}>
      <CardHeader title="À venir" link="Planning" onLink={() => router.navigate(`/voyage/${tripId}/planning` as Href)} />
      {next.map((event) => (
        <Pressable key={event.id} accessibilityRole="button" onPress={() => router.push(`/voyage/${tripId}/evenement/${event.id}` as Href)} style={styles.line}>
          <Text style={styles.day}>
            {event.startDate === today ? 'Auj.' : `${weekdayShort(event.startDate)} ${formatDayMonth(event.startDate)}`}
          </Text>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {event.title}
          </AppText>
          {event.startTime ? <Text style={styles.time}>{event.startTime}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** What the caller owes or is owed, with who: "Tu dois 42,50 € à Léa · Régler". */
export function ReimbursementsCard({ tripId, balances, meId }: { tripId: string; balances: TripBalances; meId: string }) {
  const mine = balances.transfers.filter((t) => t.from.id === meId || t.to.id === meId);
  if (!mine.length) return null;
  const settle = () => router.navigate(`/voyage/${tripId}/finances?section=balances` as Href);
  const other = (t: SuggestedTransfer) => (t.from.id === meId ? t.to : t.from);
  return (
    <View style={styles.card}>
      {mine.map((t) => (
        <View key={`${t.from.id}-${t.to.id}`} style={styles.transfer}>
          <Avatar name={other(t).displayName} color={other(t).avatarColor} size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {t.from.id === meId ? `Tu dois ${formatMoney(t.amountMinor, balances.currency)} à ${t.to.displayName}` : `${t.from.displayName} te doit ${formatMoney(t.amountMinor, balances.currency)}`}
            </AppText>
          </View>
          <Pressable accessibilityRole="button" onPress={settle} style={styles.settle}>
            <Text style={styles.settleText}>{t.from.id === meId ? 'Régler' : 'Voir'}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/** Only once a total is set: "310 € / 500 €". */
export function BudgetCard({ tripId, budget }: { tripId: string; budget: PersonalBudgetView }) {
  const total = budget.budget?.totalMinor;
  if (!total) return null;
  const ratio = Math.min(budget.spentMinor / total, 1);
  const over = budget.spentMinor > total;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.navigate(`/voyage/${tripId}/finances?section=budget` as Href)} style={[styles.card, styles.budget]}>
      <View style={styles.header}>
        <AppText variant="label" tone="secondary" style={styles.flex}>
          Mon budget
        </AppText>
        <Text style={[styles.budgetAmount, over && styles.over]}>
          {formatMoney(budget.spentMinor, budget.currency, { whole: true })} / {formatMoney(total, budget.currency, { whole: true })}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }, over && styles.fillOver]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card + 2, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.accent },
  now: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 16 },
  nowLabel: { fontFamily: fontFamily.extrabold, fontSize: 11, letterSpacing: 0.5 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 40 },
  time: { minWidth: 52, fontFamily: fontFamily.bold, fontSize: 13, color: colors.inkTertiary },
  day: { minWidth: 72, fontFamily: fontFamily.bold, fontSize: 13, color: colors.inkTertiary },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settle: { minHeight: 40, paddingHorizontal: 14, borderRadius: radii.chip, backgroundColor: colors.accentTint, justifyContent: 'center' },
  settleText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.accentInk },
  budget: { gap: spacing.sm },
  budgetAmount: { fontFamily: fontFamily.extrabold, fontSize: 16, color: colors.ink },
  over: { color: colors.danger },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.chip, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
  fillOver: { backgroundColor: colors.danger },
});
