import { localIsoDate, portfolioOf, portfolioTripLabel, type TripSummary } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { useAuth } from '@/auth/auth-context';
import { TopoLines } from '@/components/topo-lines';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TripCover, TripIcon } from '@/trips/trip-visuals';
import { useMyTrips } from '@/trips/trips-api';

/**
 * Minimal portfolio (roadmap step 9): the finished trips, with what they add up to. Private: it
 * only reads the account's own trips. Memories and sharing come later (CDC §11).
 */
export default function PortfolioScreen() {
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  const trips = useMyTrips();
  const portfolio = useMemo(() => portfolioOf(trips.data ?? [], localIsoDate()), [trips.data]);
  const signedIn = status === 'signedIn';

  let body;
  if (!signedIn) {
    body = (
      <Card title="Connecte-toi pour voir ton portfolio" text="Chaque voyage terminé s’y ajoute tout seul : destinations, dates, durée.">
        <Button title="Se connecter ou créer un compte" onPress={() => router.push('/auth')} />
      </Card>
    );
  } else if (trips.isPending) {
    body = <ActivityIndicator color={colors.accent} style={styles.loading} accessibilityLabel="Chargement du portfolio" />;
  } else if (trips.isError && !trips.data) {
    body = (
      <Card title="Impossible de charger ton portfolio" text={trips.error.message}>
        <Button title="Réessayer" variant="secondary" onPress={() => void trips.refetch()} />
      </Card>
    );
  } else if (portfolio.trips.length === 0) {
    body = (
      <Card
        title="Tes voyages terminés apparaîtront ici"
        text="Dès qu’un voyage daté est fini, il rejoint ton portfolio avec ses destinations et sa durée, sans rien avoir à remplir."
      />
    );
  } else {
    body = (
      <>
        <VisitedMap places={portfolio.destinations} />
        <View style={styles.stats}>
          <Stat value={portfolio.trips.length} label={portfolio.trips.length > 1 ? 'voyages' : 'voyage'} />
          <Stat value={portfolio.destinations.length} label={portfolio.destinations.length > 1 ? 'destinations' : 'destination'} />
          <Stat value={portfolio.days} label={portfolio.days > 1 ? 'jours' : 'jour'} />
        </View>
        <View style={styles.grid}>
          {portfolio.trips.map(({ trip, days }) => (
            <PortfolioCard key={trip.id} trip={trip} days={days} />
          ))}
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopoLines />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }]}
        refreshControl={
          signedIn ? <RefreshControl refreshing={trips.isRefetching} onRefresh={() => void trips.refetch()} tintColor={colors.accent} /> : undefined
        }
      >
        <View style={styles.header}>
          <AppText variant="display">Portfolio</AppText>
          <View style={styles.privateChip} accessibilityLabel="Portfolio privé : toi seul le vois">
            <Icon name="lock" size={12} strokeWidth={2.6} color={colors.inkTertiary} />
            <AppText variant="label" style={styles.privateText}>
              Privé
            </AppText>
          </View>
        </View>
        {body}
        <View style={styles.soon}>
          <Icon name="star" size={18} color={colors.infoInk} />
          <AppText variant="caption" style={styles.soonText}>
            Bientôt : souvenirs automatiques à la fin de chaque voyage et partage de ton portfolio par lien.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function Card({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <AppText variant="heading">{title}</AppText>
      <AppText tone="secondary">{text}</AppText>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
    </View>
  );
}

// Where the pins go on the drawn map: decoration, not geography (no coordinates in V1).
const PINS = [
  { x: 70, y: 140 },
  { x: 250, y: 60 },
  { x: 170, y: 104 },
  { x: 300, y: 140 },
];

function VisitedMap({ places }: { places: string[] }) {
  const shown = places.slice(-PINS.length);
  const pins = PINS.slice(0, shown.length);
  const route = pins.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  return (
    <View style={styles.map} accessible accessibilityLabel={`Destinations visitées : ${places.join(', ')}`}>
      <Svg width="100%" height="100%" viewBox="0 0 354 190" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <G fill="none" stroke="#B9D3C1" strokeWidth={1.5}>
          <Ellipse cx="80" cy="160" rx="130" ry="64" />
          <Ellipse cx="80" cy="160" rx="86" ry="40" />
          <Ellipse cx="290" cy="40" rx="100" ry="48" />
          <Ellipse cx="290" cy="40" rx="60" ry="26" />
          <Ellipse cx="200" cy="110" rx="40" ry="18" />
        </G>
        {pins.length > 1 ? <Path d={route} fill="none" stroke={colors.accentInk} strokeWidth={2.5} strokeDasharray="2 8" strokeLinecap="round" /> : null}
        {pins.map((p) => (
          <G key={`${p.x}-${p.y}`}>
            <Path d={`M${p.x} ${p.y + 18}s11-10 11-18a11 11 0 0 0-22 0c0 8 11 18 11 18z`} fill="#E0703C" />
            <Circle cx={p.x} cy={p.y} r={4} fill="#FFFFFF" />
          </G>
        ))}
      </Svg>
      {pins.map((p, i) => (
        <View key={shown[i]} style={[styles.pinLabel, { left: `${((p.x - 40) / 354) * 100}%`, top: `${((p.y + 18) / 190) * 100}%` }]}>
          <AppText variant="label" numberOfLines={1} style={styles.pinText}>
            {shown[i]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function PortfolioCard({ trip, days }: { trip: TripSummary; days: number }) {
  const label = portfolioTripLabel(trip.startDate!, days);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trip.title}, ${label}`}
      onPress={() => router.push(`/voyage/${trip.id}`)}
      style={({ pressed }) => [styles.tripCard, pressed && { opacity: 0.85 }]}
    >
      <TripCover color={trip.color} style={styles.cover}>
        <View style={styles.coverIcon}>
          <TripIcon icon={trip.icon} size={30} />
        </View>
      </TripCover>
      <View style={styles.tripText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {trip.title}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg + 2, gap: spacing.md + 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  privateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.chip,
    borderRadius: radii.chip,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  privateText: { fontSize: 12, color: colors.inkTertiary },
  loading: { marginTop: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  map: { height: 190, borderRadius: 24, backgroundColor: '#DCEADF', overflow: 'hidden' },
  pinLabel: { position: 'absolute', maxWidth: 120, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  pinText: { fontSize: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tripCard: { width: '48.3%', backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  cover: { height: 100 },
  coverIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tripText: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 2 },
  soon: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.infoTint, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  soonText: { flex: 1, color: colors.infoInk, lineHeight: 19 },
});
