import { daysBetween, localIsoDate, tripPhase, type TripDetail } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { formatDateRange, participantsLabel } from '@/trips/format';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripCover, TripIconTile } from '@/trips/trip-visuals';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function TripDashboardScreen() {
  const id = useTripId();
  const query = useTrip(id);
  return <TripQueryState query={query}>{(trip) => <Dashboard trip={trip} refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}</TripQueryState>;
}

function Dashboard({ trip, refreshing, onRefresh }: { trip: TripDetail; refreshing: boolean; onRefresh: () => void }) {
  const insets = useSafeAreaInsets();
  const today = localIsoDate();
  const dates = formatDateRange(trip.startDate, trip.endDate, today);
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const steps = setupSteps(trip, isOrganizer);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <TripCover color={trip.color} style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.heroBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes voyages" onPress={back} style={styles.roundButton}>
            <Icon name="back" />
          </Pressable>
          <View style={styles.avatars}>
            {trip.participants.slice(0, 3).map((p, index) => (
              <View key={p.id} style={[styles.avatarRing, index > 0 && { marginLeft: -10 }]}>
                <Avatar name={p.displayName} size={32} />
              </View>
            ))}
          </View>
        </View>
        <View style={styles.heroTitle}>
          <TripIconTile color={trip.color} icon={trip.icon} size={64} bordered />
          <View style={styles.flex}>
            <AppText variant="title" numberOfLines={2}>
              {trip.title}
            </AppText>
            <AppText variant="caption" style={styles.heroSubtitle}>
              {[dates ?? 'Dates à décider', trip.destination, participantsLabel(trip.participantCount)].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      </TripCover>

      <View style={styles.body}>
        <PhaseCard trip={trip} today={today} />

        {steps.length > 0 ? (
          <View style={styles.card}>
            <AppText variant="heading">Pour bien démarrer</AppText>
            {steps.map((step) => (
              <Pressable key={step.label} accessibilityRole="button" onPress={step.onPress} style={styles.step}>
                <View style={styles.stepIcon}>
                  <Icon name={step.icon} color={colors.accentInk} size={20} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{step.label}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {step.hint}
                  </AppText>
                </View>
                <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PhaseCard({ trip, today }: { trip: TripDetail; today: string }) {
  if (!trip.startDate) return null;
  const phase = tripPhase(trip, today);
  const end = trip.endDate ?? trip.startDate;
  const total = daysBetween(trip.startDate, end) + 1;

  let title: string;
  let detail: string;
  if (phase === 'ongoing') {
    title = `Jour ${daysBetween(trip.startDate, today) + 1} sur ${total}`;
    detail = 'Bon voyage ! Le planning du jour apparaîtra ici.';
  } else if (phase === 'upcoming') {
    const days = daysBetween(today, trip.startDate);
    title = days === 1 ? 'Départ demain' : `Départ dans ${days} jours`;
    detail = `${total} jour${total > 1 ? 's' : ''} de voyage.`;
  } else {
    title = 'Voyage terminé';
    detail = 'Il rejoindra bientôt ton portfolio.';
  }

  return (
    <View style={[styles.card, styles.phaseCard]}>
      <View style={styles.stepIcon}>
        <Icon name="calendar" color={colors.accentInk} size={20} />
      </View>
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {detail}
        </AppText>
      </View>
    </View>
  );
}

interface Step {
  label: string;
  hint: string;
  icon: IconName;
  onPress: () => void;
}

/** Only what is still missing — the dashboard never shows empty or useless blocks (CDC §3.2). */
function setupSteps(trip: TripDetail, isOrganizer: boolean): Step[] {
  if (!isOrganizer) return [];
  const edit = () => router.push(`/voyage/${trip.id}/modifier` as Href);
  const steps: Step[] = [];
  if (!trip.destination) steps.push({ label: 'Ajouter une destination', hint: 'Ou laisse le groupe voter plus tard', icon: 'pin', onPress: edit });
  if (!trip.startDate) steps.push({ label: 'Choisir les dates', hint: 'Facultatif, modifiable à tout moment', icon: 'calendar', onPress: edit });
  if (trip.kind === 'GROUP' && trip.participantCount === 1) {
    steps.push({
      label: 'Inviter tes amis',
      hint: 'Ils pourront rejoindre et voter sans compte',
      icon: 'users',
      onPress: () => Alert.alert('Bientôt', 'Les invitations arrivent avec la prochaine mise à jour.'),
    });
  }
  return steps;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xxl,
  },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatars: { flexDirection: 'row' },
  avatarRing: { borderRadius: 18, borderWidth: 2, borderColor: colors.surface },
  heroTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 },
  heroSubtitle: { color: colors.inkTertiary },
  body: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.card + 2, padding: spacing.lg, gap: spacing.md },
  phaseCard: { flexDirection: 'row', alignItems: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
