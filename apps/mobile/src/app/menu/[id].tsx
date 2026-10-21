import { colors, radii } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ActionRow } from '@/components/action-row';
import { Sheet } from '@/components/sheet';
import { can } from '@/trips/permissions';
import { useMyTrips, useTrip } from '@/trips/trips-api';
import { useConfirmDeleteTrip } from '@/trips/use-confirm-delete-trip';
import { useConfirmLeaveTrip } from '@/trips/use-confirm-leave-trip';

/**
 * Everything one can do with a trip, as a sheet: from the "…" of the trip, or a long press on its card.
 * `ouvrir=1` (from the list) adds a line to open the trip.
 */
export default function TripMenuSheet() {
  const { id, ouvrir } = useLocalSearchParams<{ id: string; ouvrir?: string }>();
  const detail = useTrip(id).data;
  const summary = useMyTrips().data?.find((t) => t.id === id);
  const trip = detail ?? summary;
  const confirmDelete = useConfirmDeleteTrip({ id, title: trip?.title ?? '' });
  const confirmLeave = useConfirmLeaveTrip({ id, title: trip?.title ?? '' });

  if (!trip) {
    return (
      <Sheet title="Voyage">
        <ActivityIndicator color={colors.accent} />
      </Sheet>
    );
  }

  const isOrganizer = trip.myRole === 'ORGANIZER';
  // The list only knows the role; the invite policy comes with the detail.
  const canInvite = detail ? can('invite', detail) : isOrganizer;
  // Close the sheet first; `withAnchor` puts the trip under a screen opened from the list.
  const go = (href: string) => () => {
    router.back();
    router.push(href as Href, { withAnchor: true });
  };
  const then = (action: () => void) => () => {
    router.back();
    action();
  };

  return (
    <Sheet title={trip.title}>
      <View style={styles.card}>
        {ouvrir ? <ActionRow icon="suitcase" label="Ouvrir le voyage" onPress={go(`/voyage/${id}`)} /> : null}
        {canInvite ? <ActionRow icon="users" label="Inviter des amis" onPress={go(`/voyage/${id}/inviter`)} /> : null}
        {isOrganizer ? <ActionRow icon="pencil" label="Modifier le voyage" onPress={go(`/voyage/${id}/modifier`)} /> : null}
        <ActionRow icon="sliders" label="Paramètres et notifications" onPress={go(`/voyage/${id}/parametres`)} />
      </View>
      <View style={styles.card}>
        {trip.participantCount > 1 ? <ActionRow icon="logout" label="Quitter le voyage" danger onPress={then(confirmLeave)} /> : null}
        {isOrganizer ? <ActionRow icon="trash" label="Supprimer le voyage" danger onPress={then(confirmDelete)} /> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: 4 },
});
