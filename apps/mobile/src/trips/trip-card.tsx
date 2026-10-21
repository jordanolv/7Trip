import { formatDestinations, tripPhase, type TripSummary } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';

import { formatDateRange, participantsLabel, tripBadge } from './format';
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

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => <TripCardActions trip={trip} swipeable={methods} />}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${trip.title}, ${subtitle}, ${badge}`}
        accessibilityHint="Glisse vers la gauche pour plus d’actions"
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
            {phase !== 'ongoing' ? <TripStatusChip trip={trip} today={today} /> : <View />}
            <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

/** Revealed by swiping a card left: the same trip actions as in the trip, without opening it. */
function TripCardActions({ trip, swipeable }: { trip: TripSummary; swipeable: SwipeableMethods }) {
  const confirmDelete = useConfirmDeleteTrip(trip);
  const confirmLeave = useConfirmLeaveTrip(trip);
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const then = (action: () => void) => () => {
    swipeable.close();
    action();
  };

  return (
    <View style={styles.actions}>
      {isOrganizer ? <CardAction icon="pencil" label="Modifier" onPress={then(() => router.push(`/voyage/${trip.id}/modifier` as Href))} /> : null}
      {/* Alone in a trip, leaving would orphan it: deleting is the way out. */}
      {trip.participantCount > 1 ? <CardAction icon="logout" label="Quitter" onPress={then(confirmLeave)} /> : null}
      {isOrganizer ? <CardAction icon="trash" label="Supprimer" danger onPress={then(confirmDelete)} /> : null}
    </View>
  );
}

function CardAction({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? colors.danger : colors.accentInk;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.action, danger && styles.actionDanger]}>
      <Icon name={icon} color={color} size={22} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
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
  actions: { flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.sm },
  action: { width: 76, borderRadius: radii.card, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionDanger: { backgroundColor: colors.dangerTint },
  actionText: { fontFamily: fontFamily.bold, fontSize: 12 },
});
