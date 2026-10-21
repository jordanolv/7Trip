import { formatDateRange, formatDestinations, participantsLabel, tripBadge, tripPhase, type TripSummary } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SwipeRow, type SwipeAction } from '@/components/swipe-row';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

import { TripStatusChip } from './status-chip';
import { TripCover, TripIcon } from './trip-visuals';
import { useConfirmDeleteTrip } from './use-confirm-delete-trip';
import { useConfirmLeaveTrip } from './use-confirm-leave-trip';

export function TripCard({ trip, today }: { trip: TripSummary; today: string }) {
  const phase = tripPhase(trip, today);
  const dates = formatDateRange(trip.startDate, trip.endDate, today);
  const where = [formatDestinations(trip.destinations), dates].filter(Boolean).join(' · ');
  const subtitle = `${where || 'Destination et dates à décider'} · ${participantsLabel(trip.participantCount)}`;
  const badge = tripBadge(trip, today);
  const actions = useTripCardActions(trip);

  return (
    <SwipeRow
      variant="card"
      actions={actions}
      accessibilityLabel={`${trip.title}, ${subtitle}, ${badge}`}
      onPress={() => router.push(`/voyage/${trip.id}`)}
      onLongPress={() => router.push(`/menu/${trip.id}?ouvrir=1` as Href)}
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
          {phase !== 'ongoing' ? <TripStatusChip trip={trip} today={today} /> : <View />}
          <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
        </View>
      </View>
    </SwipeRow>
  );
}

/** Revealed by swiping a card left: the same trip actions as in the trip, without opening it. */
function useTripCardActions(trip: TripSummary): SwipeAction[] {
  const confirmDelete = useConfirmDeleteTrip(trip);
  const confirmLeave = useConfirmLeaveTrip(trip);
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const actions: SwipeAction[] = [];
  if (isOrganizer) actions.push({ icon: 'pencil', label: 'Modifier', onPress: () => router.push(`/voyage/${trip.id}/modifier` as Href, { withAnchor: true }) });
  // Alone in a trip, leaving would orphan it: deleting is the way out.
  if (trip.participantCount > 1) actions.push({ icon: 'logout', label: 'Quitter', onPress: confirmLeave });
  if (isOrganizer) actions.push({ icon: 'trash', label: 'Supprimer', danger: true, onPress: confirmDelete });
  return actions;
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
