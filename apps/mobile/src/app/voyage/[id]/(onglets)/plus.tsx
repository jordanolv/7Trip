import { canDo, type TripDetail } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { ParticipantRow } from '@/trips/participant-row';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripIconTile } from '@/trips/trip-visuals';
import { useTrip } from '@/trips/trips-api';
import { useConfirmDeleteTrip } from '@/trips/use-confirm-delete-trip';
import { useConfirmLeaveTrip } from '@/trips/use-confirm-leave-trip';
import { useTripId } from '@/trips/use-trip-id';

export default function PlusScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <PlusContent trip={trip} />}</TripQueryState>;
}

function PlusContent({ trip }: { trip: TripDetail }) {
  const insets = useSafeAreaInsets();
  const isOrganizer = trip.myRole === 'ORGANIZER';
  const confirmDelete = useConfirmDeleteTrip(trip);
  const canInvite = canDo('invite', trip.myRole, trip);
  const confirmLeave = useConfirmLeaveTrip(trip);
  const soon = (what: string) => () => Alert.alert('Bientôt', `${what} arrive dans une prochaine mise à jour.`);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TripIconTile color={trip.color} icon={trip.icon} size={48} />
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={1}>
            {trip.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {isOrganizer ? 'Tu es organisateur' : 'Tu es participant'}
          </AppText>
        </View>
      </View>

      <View style={styles.grid}>
        <Tile icon="poll" title="Sondages" detail="Bientôt" onPress={soon('Les sondages')} />
        <Tile icon="folder" title="Documents" detail="Bientôt" onPress={soon('Les documents')} />
      </View>

      <Section
        title={`Participants · ${trip.participantCount}`}
        footer={isOrganizer && trip.participantCount > 1 ? 'Glisse un participant vers la gauche pour changer son rôle ou le retirer.' : undefined}
      >
        {trip.participants.map((p) => (
          <ParticipantRow key={p.id} trip={trip} participant={p} />
        ))}
        {canInvite ? <Row icon="users" label="Inviter des amis" onPress={() => router.push(`/voyage/${trip.id}/inviter` as Href)} /> : null}
      </Section>

      <Section title="Voyage">
        {isOrganizer ? <Row icon="pencil" label="Modifier le voyage" onPress={() => router.push(`/voyage/${trip.id}/modifier` as Href)} /> : null}
        <Row icon="sliders" label="Paramètres et notifications" onPress={() => router.push(`/voyage/${trip.id}/parametres` as Href)} />
        <Row icon="logout" label="Quitter le voyage" danger onPress={confirmLeave} />
        {isOrganizer ? <Row icon="trash" label="Supprimer le voyage" danger onPress={confirmDelete} /> : null}
      </Section>
    </ScrollView>
  );
}

function Tile({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Icon name={icon} color={colors.accentInk} />
      </View>
      <View>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {detail}
        </AppText>
      </View>
    </Pressable>
  );
}

function Section({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
      {footer ? (
        <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

function Row({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon name={icon} color={danger ? colors.danger : colors.accentInk} size={18} />
      </View>
      <AppText variant="bodyStrong" style={[styles.flex, danger && { color: colors.danger }]}>
        {label}
      </AppText>
      {danger ? null : <Icon name="chevronRight" color={colors.inkSecondary} size={18} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, padding: spacing.lg, gap: spacing.md + 2 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg - 2 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: colors.dangerTint },
});
