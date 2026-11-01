import { NOTIFICATION_TOPICS, NOTIFICATION_TOPIC_LABELS, formatDestinations, type NotificationTopic, type TripDetail } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { errorMessage } from '@/lib/api';
import { useNotificationPrefs, useSetNotificationPrefs } from '@/notifications/notifications-api';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripIconTile } from '@/trips/trip-visuals';
import { useTrip, useUpdateTrip } from '@/trips/trips-api';
import { useConfirmDeleteTrip } from '@/trips/use-confirm-delete-trip';
import { useTripId } from '@/trips/use-trip-id';

export default function ParametresScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <Parametres trip={trip} />}</TripQueryState>;
}

/** Settings of a trip: the organizer's, and everyone's notifications. */
function Parametres({ trip }: { trip: TripDetail }) {
  const update = useUpdateTrip(trip.id);
  const confirmDelete = useConfirmDeleteTrip(trip);
  const isOrganizer = trip.myRole === 'ORGANIZER';
  // Optimistic only while saving; on failure the switch goes back to the saved value.
  const shownPolicy = (update.isPending ? update.variables.invitePolicy : undefined) ?? trip.invitePolicy;
  const everyoneInvites = shownPolicy === 'ALL';

  const setEveryoneInvites = (value: boolean) =>
    void update
      .mutateAsync({ invitePolicy: value ? 'ALL' : 'ORGANIZERS' })
      .catch((error: unknown) => Alert.alert('Modification impossible', errorMessage(error)));

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
          <NotificationSettings tripId={trip.id} />
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

function NotificationSettings({ tripId }: { tripId: string }) {
  const { status, guestSessions } = useAuth();
  const hasAccount = status === 'signedIn' && !guestSessions[tripId];
  const query = useNotificationPrefs(tripId, hasAccount);
  const update = useSetNotificationPrefs(tripId);
  const allowed = useNotificationsAllowed();

  if (!hasAccount) {
    return (
      <View style={styles.row}>
        <AppText tone="secondary" style={styles.flex}>
          Crée un compte pour recevoir les notifications de ce voyage.
        </AppText>
      </View>
    );
  }
  if (!query.data) {
    return (
      <View style={styles.row}>
        <AppText tone="secondary" style={styles.flex}>
          {query.isError ? errorMessage(query.error) : 'Chargement…'}
        </AppText>
      </View>
    );
  }
  // Optimistic only while saving; on failure the switch goes back to the saved value.
  const prefs = { ...query.data, ...(update.isPending ? update.variables : {}) };
  const set = (topic: NotificationTopic, value: boolean) =>
    void update.mutateAsync({ [topic]: value }).catch((error: unknown) => Alert.alert('Modification impossible', errorMessage(error)));

  return (
    <>
      {allowed === false ? (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={[styles.row, styles.separated]}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Notifications coupées sur ce téléphone</AppText>
            <AppText variant="caption" tone="secondary">
              Autorise-les dans les réglages pour recevoir celles-ci
            </AppText>
          </View>
          <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
        </Pressable>
      ) : null}
      {NOTIFICATION_TOPICS.map((topic, index) => {
        const { label, hint } = NOTIFICATION_TOPIC_LABELS[topic];
        return (
          <View key={topic} style={[styles.row, (index > 0 || allowed === false) && styles.separated]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{label}</AppText>
              <AppText variant="caption" tone="secondary">
                {hint}
              </AppText>
            </View>
            <Switch
              accessibilityLabel={label}
              value={prefs[topic]}
              onValueChange={(value) => set(topic, value)}
              disabled={update.isPending}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        );
      })}
    </>
  );
}

/** Whether the system lets the app notify; checked again on each visit (changed in the settings meanwhile). */
function useNotificationsAllowed(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      void Notifications.getPermissionsAsync().then(({ status }) => setAllowed(status === 'granted'));
    }, []),
  );
  return allowed;
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
  separated: { borderTopWidth: 1, borderTopColor: colors.separator },
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
