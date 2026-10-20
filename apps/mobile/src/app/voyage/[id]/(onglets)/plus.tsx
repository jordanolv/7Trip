import type { TripDetail } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripIconTile } from '@/trips/trip-visuals';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function PlusScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <PlusContent trip={trip} />}</TripQueryState>;
}

function PlusContent({ trip }: { trip: TripDetail }) {
  const insets = useSafeAreaInsets();
  const isOrganizer = trip.myRole === 'ORGANIZER';
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

      <Section title="Participants">
        {trip.participants.map((p) => (
          <View key={p.id} style={styles.row}>
            <Avatar name={p.displayName} size={36} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {p.displayName}
              {p.isMe ? ' (toi)' : ''}
            </AppText>
            <View style={[styles.role, p.role === 'ORGANIZER' ? styles.roleOrganizer : styles.roleParticipant]}>
              <AppText variant="label" style={{ fontSize: 11, color: p.role === 'ORGANIZER' ? colors.surface : colors.inkTertiary }}>
                {p.role === 'ORGANIZER' ? 'Organisateur' : 'Participant'}
              </AppText>
            </View>
          </View>
        ))}
        <Row icon="users" label="Inviter des amis" onPress={soon('L’invitation par lien')} />
      </Section>

      {isOrganizer ? (
        <Section title="Voyage">
          <Row icon="pencil" label="Nom, destination et dates" onPress={() => router.push(`/voyage/${trip.id}/modifier` as Href)} />
          <Row icon="palette" label="Couleur et icône" onPress={() => router.push(`/voyage/${trip.id}/personnaliser` as Href)} />
          <Row icon="sliders" label="Paramètres et notifications" onPress={soon('Les paramètres du voyage')} />
        </Section>
      ) : null}
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

function Row({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={icon} color={colors.accentInk} size={18} />
      </View>
      <AppText variant="bodyStrong" style={styles.flex}>
        {label}
      </AppText>
      <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
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
  role: { borderRadius: radii.chip, paddingHorizontal: 9, paddingVertical: 4 },
  roleOrganizer: { backgroundColor: colors.ink },
  roleParticipant: { backgroundColor: colors.chip },
});
