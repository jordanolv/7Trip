import { formatDestinations, type TripDetail } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { ApiError } from '@/lib/api';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripIconTile } from '@/trips/trip-visuals';
import { useTrip, useUpdateTrip } from '@/trips/trips-api';
import { useConfirmDeleteTrip } from '@/trips/use-confirm-delete-trip';
import { useTripId } from '@/trips/use-trip-id';

export default function ParametresScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <Parametres trip={trip} />}</TripQueryState>;
}

/** Organizer settings of a trip. Notification preferences arrive with step 8. */
function Parametres({ trip }: { trip: TripDetail }) {
  const update = useUpdateTrip(trip.id);
  const confirmDelete = useConfirmDeleteTrip(trip);
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const everyoneInvites = (update.variables?.invitePolicy ?? trip.invitePolicy) === 'ALL';

  const setEveryoneInvites = (value: boolean) =>
    void update
      .mutateAsync({ invitePolicy: value ? 'ALL' : 'ORGANIZERS' })
      .catch((error: unknown) => Alert.alert('Modification impossible', error instanceof ApiError ? error.message : 'Réessaie dans un instant.'));

  return (
    <>
      <ScreenHeader mode="close" title="Paramètres" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {isOrganizer ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/voyage/${trip.id}/modifier` as Href)} style={[styles.card, styles.row]}>
            <TripIconTile color={trip.color} icon={trip.icon} size={44} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {trip.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {formatDestinations(trip.destinations) ?? 'Nom, destinations, dates, couleur, icône'}
              </AppText>
            </View>
            <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
          </Pressable>
        ) : null}

        <Section title="INVITATIONS">
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Tout le monde peut inviter</AppText>
              <AppText variant="caption" tone="secondary">
                Sinon, organisateurs uniquement
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Tout le monde peut inviter"
              value={everyoneInvites}
              onValueChange={setEveryoneInvites}
              disabled={!isOrganizer || update.isPending}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </Section>

        <Section title="NOTIFICATIONS POUR CE VOYAGE">
          <View style={styles.row}>
            <AppText tone="secondary" style={styles.flex}>
              Sondages, planning, rappels et remboursements : les réglages arrivent avec les notifications.
            </AppText>
          </View>
        </Section>

        {isOrganizer ? (
          <Section title="ZONE SENSIBLE">
            <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.row}>
              <View style={styles.dangerIcon}>
                <Icon name="trash" color={colors.danger} size={18} />
              </View>
              <AppText variant="bodyStrong" style={[styles.flex, { color: colors.danger }]}>
                Supprimer le voyage
              </AppText>
            </Pressable>
          </Section>
        ) : null}
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs, letterSpacing: 0.8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, padding: spacing.md + 2, paddingHorizontal: spacing.lg },
  dangerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
