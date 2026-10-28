import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_FILTER_LABELS,
  EVENT_CATEGORY_LABELS,
  eventOnDay,
  findOverlaps,
  formatTimeRange,
  localIsoDate,
  overlapMessage,
  planningDays,
  weekdayShort,
  type EventCategory,
  type TripEvent,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useEvents } from '@/events/events-api';
import { EventIcon, eventDays, eventPeople, eventStyle } from '@/events/event-visuals';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

type Filter = 'all' | EventCategory;

/** Minutes, for laying out the timed events of a day. */
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const endOf = (event: TripEvent) => (event.endTime ? minutes(event.endTime) : minutes(event.startTime!) + 60);

/** Timed events whose times overlap sit side by side; the others follow one another. */
function clusters(events: TripEvent[]): TripEvent[][] {
  const result: TripEvent[][] = [];
  let end = -1;
  for (const event of events) {
    const last = result.at(-1);
    if (last && minutes(event.startTime!) < end) last.push(event);
    else result.push([event]);
    end = Math.max(last && minutes(event.startTime!) < end ? end : 0, endOf(event));
  }
  return result;
}

/** The trip day by day (CDC §7): activities, meals, transport and stays in one timeline. */
export default function PlanningScreen() {
  const tripId = useTripId();
  const insets = useSafeAreaInsets();
  const trip = useTrip(tripId);
  const events = useEvents(tripId);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<string | null>(null);

  // The tab stays mounted: each visit shows what the others added meanwhile.
  const { refetch } = events;
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );

  const all = events.data ?? [];
  const days = planningDays({ startDate: trip.data?.startDate ?? null, endDate: trip.data?.endDate ?? null }, all);
  const today = localIsoDate();
  // Today during the trip, otherwise its first day.
  const day = picked && days.includes(picked) ? picked : days.includes(today) ? today : (days[0] ?? null);

  const ofDay = day ? all.filter((event) => eventOnDay(event, day) && (filter === 'all' || event.category === filter)) : [];
  const allDay = ofDay.filter((event) => !event.startTime || (event.endDate && event.startDate !== day));
  const timed = ofDay.filter((event) => !allDay.includes(event));
  const everyone = trip.data?.participants.map((p) => p.id) ?? [];
  const overlaps = findOverlaps(timed, everyone);
  const add = () => router.push(`/voyage/${tripId}/evenement/nouveau${day ? `?jour=${day}` : ''}` as Href);
  const open = (event: TripEvent) => router.push(`/voyage/${tripId}/evenement/${event.id}` as Href);

  const names = (ids: string[]) => ids.map((id) => trip.data?.participants.find((p) => p.id === id)?.displayName ?? '?');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={<RefreshControl refreshing={events.isRefetching} onRefresh={() => void events.refetch()} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Planning</AppText>
          {trip.data ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {trip.data.title}
            </AppText>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un événement" onPress={add} style={styles.add}>
          <Icon name="plus" color={colors.surface} size={24} />
        </Pressable>
      </View>

      {events.isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : events.isError && !events.data ? (
        <View style={styles.empty}>
          <AppText variant="heading">Impossible de charger le planning</AppText>
          <AppText tone="secondary">{events.error.message}</AppText>
          <Button title="Réessayer" variant="soft" onPress={() => void events.refetch()} />
        </View>
      ) : days.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="calendar" color={colors.accentInk} size={26} />
          </View>
          <AppText variant="heading">Rien au planning pour l’instant</AppText>
          <AppText tone="secondary">
            Une visite, un resto, un train, l’hôtel… Ajoute un événement, ou planifie une idée depuis la boîte à idées.
          </AppText>
          <Button title="Ajouter un événement" onPress={add} icon={<Icon name="plus" color={colors.surface} size={20} />} />
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
            {days.map((d) => {
              const active = d === day;
              const busy = all.some((event) => eventOnDay(event, d));
              return (
                <Pressable
                  key={d}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${weekdayShort(d)} ${Number(d.slice(8, 10))}${busy ? ', des événements' : ''}`}
                  onPress={() => setPicked(d)}
                  style={[styles.day, active && styles.dayActive]}
                >
                  <Text style={[styles.dayName, active && styles.dayTextActive]}>{weekdayShort(d)}</Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>{Number(d.slice(8, 10))}</Text>
                  <View style={[styles.dot, busy && { backgroundColor: active ? colors.surface : colors.accent }]} />
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['all', ...EVENT_CATEGORIES] as const).map((key) => {
              const active = key === filter;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(key)}
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {key === 'all' ? 'Tout' : EVENT_CATEGORY_FILTER_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {day && trip.data?.startDate && (day < trip.data.startDate || day > (trip.data.endDate ?? trip.data.startDate)) ? (
            <View style={styles.outside}>
              <Icon name="alert" color={colors.infoInk} size={16} />
              <Text style={styles.outsideText}>Ce jour est en dehors des dates du voyage : ses événements y sont restés quand les dates ont changé.</Text>
            </View>
          ) : null}

          <View style={styles.timeline}>
            {allDay.map((event) => (
              <AllDayRow key={event.id} event={event} onPress={() => open(event)} />
            ))}

            {clusters(timed).map((group) => {
              const warnings = overlaps.filter((o) => group.includes(o.first));
              const start = group[0]!.startTime!;
              const end = Math.max(...group.map(endOf));
              const lastEnd = group.length === 1 ? group[0]!.endTime : `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
              return (
                <View key={group[0]!.id} style={styles.slot}>
                  <View style={styles.hours}>
                    <Text style={styles.hourStart}>{start}</Text>
                    {lastEnd ? <Text style={styles.hourEnd}>{lastEnd}</Text> : null}
                  </View>
                  <View style={styles.flex}>
                    {group.length === 1 ? (
                      <EventCard event={group[0]!} onPress={() => open(group[0]!)} />
                    ) : (
                      <View style={styles.grid}>
                        {group.map((event) => (
                          <CompactCard key={event.id} event={event} onPress={() => open(event)} />
                        ))}
                      </View>
                    )}
                    {warnings.map((o) => (
                      <View key={`${o.first.id}-${o.second.id}`} style={styles.warning} accessibilityRole="alert">
                        <Icon name="alert" color={colors.warningInk} size={16} />
                        <Text style={styles.warningText}>
                          {overlapMessage(names(o.participantIds), everyone.length > 1 && o.participantIds.length === everyone.length, o.from, o.to)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {ofDay.length === 0 ? (
              <View style={styles.none}>
                <AppText tone="secondary" style={styles.noneText}>
                  {filter === 'all' ? 'Rien de prévu ce jour-là.' : `Aucun événement « ${EVENT_CATEGORY_FILTER_LABELS[filter]} » ce jour-là.`}
                </AppText>
                <Button title="Ajouter un événement" variant="secondary" onPress={add} />
              </View>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

/** A stay or an untimed event, on top of the day. */
function AllDayRow({ event, onPress }: { event: TripEvent; onPress: () => void }) {
  const { tint, ink } = eventStyle(event.category);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.allDay, { backgroundColor: tint }, pressed && styles.pressed]}
    >
      <EventIcon category={event.category} size={18} />
      <Text style={styles.allDayText} numberOfLines={1}>
        <Text style={styles.allDayTitle}>{event.title}</Text>
        {event.endDate ? <Text style={styles.allDayMeta}> · {eventDays(event)}</Text> : null}
      </Text>
      <Text style={[styles.allDayBadge, { color: ink }]}>{formatTimeRange(event) ?? 'Toute la journée'}</Text>
    </Pressable>
  );
}

function EventCard({ event, onPress }: { event: TripEvent; onPress: () => void }) {
  const meta = [EVENT_CATEGORY_LABELS[event.category], event.place ?? eventPeople(event)].join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { borderLeftColor: eventStyle(event.category).edge }, pressed && styles.pressed]}
    >
      <AppText variant="bodyStrong" numberOfLines={2}>
        {event.title}
      </AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.meta}>
        {meta}
      </AppText>
      {event.bookingRef || event.idea ? (
        <View style={styles.tags}>
          {event.idea ? <Text style={styles.tag}>Idée</Text> : null}
          {event.bookingRef ? <Text style={styles.tag}>Réf. {event.bookingRef}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function CompactCard({ event, onPress }: { event: TripEvent; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.compact, { borderLeftColor: eventStyle(event.category).edge }, pressed && styles.pressed]}
    >
      <Text style={styles.compactTime}>{formatTimeRange(event)}</Text>
      <AppText variant="bodyStrong" numberOfLines={2} style={styles.compactTitle}>
        {event.title}
      </AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1}>
        {eventPeople(event)}
      </AppText>
    </Pressable>
  );
}

const shadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  add: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  loading: { marginTop: spacing.xxl },
  days: { gap: spacing.sm, paddingTop: spacing.xs },
  day: { width: 52, height: 66, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayActive: { backgroundColor: colors.ink },
  dayName: { fontFamily: fontFamily.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: colors.ink },
  dayNum: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.ink },
  dayTextActive: { color: colors.surface },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: 'transparent' },
  filters: { gap: spacing.sm },
  filter: { minHeight: 36, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.chip, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.ink },
  filterText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.inkTertiary },
  filterTextActive: { color: colors.surface },
  timeline: { gap: 10, marginTop: spacing.xs },
  allDay: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  allDayText: { flex: 1, fontSize: 13, color: colors.ink },
  allDayTitle: { fontFamily: fontFamily.bold },
  allDayMeta: { fontFamily: fontFamily.medium, color: colors.inkSecondary },
  allDayBadge: { fontFamily: fontFamily.bold, fontSize: 11 },
  slot: { flexDirection: 'row', gap: spacing.md },
  hours: { width: 44, paddingTop: spacing.md, alignItems: 'flex-end' },
  hourStart: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  hourEnd: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkSecondary },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md, borderLeftWidth: 4, ...shadow },
  meta: { marginTop: 2 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 6 },
  tag: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: colors.inkTertiary,
    backgroundColor: colors.chipSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compact: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 10, borderLeftWidth: 4, ...shadow },
  compactTime: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkSecondary },
  compactTitle: { marginTop: 2 },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.warningTint,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
  },
  warningText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 17, color: '#6E2F0C' },
  pressed: { opacity: 0.7 },
  outside: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.infoTint, borderRadius: 12, padding: 10 },
  outsideText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 17, color: colors.infoInk },
  empty: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  none: { alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  noneText: { textAlign: 'center' },
});
