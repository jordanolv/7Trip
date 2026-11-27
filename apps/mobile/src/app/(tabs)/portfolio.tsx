import { localIsoDate, portfolioOf } from '@7trip/shared';
import { colors, radii, spacing } from '@7trip/ui-tokens';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { Card, PortfolioCard, Stat, VisitedMap } from '@/components/portfolio';
import { TopoLines } from '@/components/topo-lines';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useMyTrips } from '@/trips/trips-api';

/**
 * Minimal portfolio (roadmap step 9): the finished trips, with what they add up to. Private: it
 * only reads the account's own trips. Memories and sharing come later (CDC §11).
 */
export default function PortfolioScreen() {
  const { status } = useAuth();
  const insets = useSafeAreaInsets();
  const trips = useMyTrips();
  // The day trips are judged against, as on the Voyages screen. The tab stays mounted, and a
  // refresh can hand back the very same trips, so it is read again whenever the tab comes back
  // into view or is refreshed: a trip that ended past midnight then joins the portfolio.
  const [today, setToday] = useState(localIsoDate);
  useFocusEffect(useCallback(() => setToday(localIsoDate()), []));
  const refresh = () => {
    setToday(localIsoDate());
    void trips.refetch();
  };
  const portfolio = useMemo(() => portfolioOf(trips.data ?? [], today), [trips.data, today]);
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
        <Button title="Réessayer" variant="secondary" onPress={refresh} />
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
          signedIn ? <RefreshControl refreshing={trips.isRefetching} onRefresh={refresh} tintColor={colors.accent} /> : undefined
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
  stats: { flexDirection: 'row', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  soon: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.infoTint, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  soonText: { flex: 1, color: colors.infoInk, lineHeight: 19 },
});
