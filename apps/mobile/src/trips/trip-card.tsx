import { formatDestinations, tripPhase, type TripSummary } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

import { formatDateRange, participantsLabel, tripBadge } from './format';
import { TripStatusChip } from './status-chip';
import { TripCover, TripIcon } from './trip-visuals';

export function TripCard({ trip, today }: { trip: TripSummary; today: string }) {
  const phase = tripPhase(trip, today);
  const dates = formatDateRange(trip.startDate, trip.endDate, today);
  const where = [formatDestinations(trip.destinations), dates].filter(Boolean).join(' · ');
  const subtitle = `${where || 'Destination et dates à décider'} · ${participantsLabel(trip.participantCount)}`;
  const badge = tripBadge(trip, today);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.title}, ${subtitle}, ${badge}`}
      onPress={() => router.push(`/voyage/${trip.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <TripCover color={trip.color} style={styles.cover}>
        <View style={styles.coverIcon}>
          <TripIcon icon={trip.icon} size={32} color={colors.ink} />
        </View>
        {phase === 'ongoing' ? (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </TripCover>
      <View style={styles.body}>
        <View>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {trip.title}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.footer}>
          {phase !== 'ongoing' ? (
            <TripStatusChip trip={trip} today={today} />
          ) : (
            <View />
          )}
          <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    minHeight: 116,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  cover: { width: 120 },
  coverIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.75 },
  liveBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  liveBadgeText: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.surface },
  body: { flex: 1, padding: spacing.md, paddingLeft: spacing.md + 2, justifyContent: 'space-between', gap: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

