import { localIsoDate, sortTrips, tripPhase, type TripPhase } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { useAuth } from '@/auth/auth-context';
import { Avatar } from '@/components/avatar';
import { TopoLines } from '@/components/topo-lines';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { takePendingInvitation } from '@/lib/invitation-link';
import { TripCard } from '@/trips/trip-card';
import { useGuestTrips, useMyTrips } from '@/trips/trips-api';

type Filter = 'all' | TripPhase;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'ongoing', label: 'En cours' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'past', label: 'Terminés' },
];

export default function VoyagesScreen() {
  const { status, user } = useAuth();
  const insets = useSafeAreaInsets();
  const signedIn = status === 'signedIn' && user;
  const trips = useMyTrips();

  const startTrip = () => {
    if (user?.emailVerified) {
      router.push('/voyage/nouveau');
      return;
    }
    Alert.alert('Confirme ton email', 'Confirme d’abord ton adresse email pour créer un voyage.', [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Saisir le code', onPress: () => router.push('/auth/verifier') },
    ]);
  };

  return (
    <View style={styles.screen}>
      <TopoLines />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
        refreshControl={
          signedIn ? (
            <RefreshControl refreshing={trips.isRefetching} onRefresh={() => void trips.refetch()} tintColor={colors.accent} />
          ) : undefined
        }
      >
        <View style={styles.topBar}>
          <AppText variant="logo">7Trip</AppText>
          {signedIn ? (
            <View style={styles.topActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
                <Icon name="bell" size={24} strokeWidth={1.9} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.navigate('/profil')}>
                <Avatar name={user.displayName} />
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={styles.signInPill}>
              <AppText variant="label">Se connecter</AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <AppText variant="display">Vos voyages</AppText>
            <AppText tone="secondary">Des idées aujourd’hui, des souvenirs demain</AppText>
          </View>
          {signedIn ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Nouveau voyage" onPress={startTrip} style={styles.addButton}>
              <Icon name="plus" color={colors.surface} strokeWidth={2.4} size={24} />
            </Pressable>
          ) : (
            <View
              accessible
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Nouveau voyage — connexion requise"
              style={styles.addButtonDisabled}
            >
              <Icon name="plus" color="#8C8A84" strokeWidth={2.4} size={24} />
            </View>
          )}
        </View>

        {signedIn ? <SignedInContent emailVerified={user.emailVerified} email={user.email} trips={trips} /> : <VisitorContent />}
      </ScrollView>
    </View>
  );
}

function SignedInContent({
  emailVerified,
  email,
  trips,
}: {
  emailVerified: boolean;
  email: string;
  trips: ReturnType<typeof useMyTrips>;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const today = localIsoDate();
  const visible = useMemo(
    () => sortTrips(trips.data ?? [], today).filter((trip) => filter === 'all' || tripPhase(trip, today) === filter),
    [trips.data, filter, today],
  );

  // Invitation link opened while signed out: resume it once back here, signed in.
  useFocusEffect(
    useCallback(() => {
      const code = takePendingInvitation();
      if (code) router.push({ pathname: '/j/[code]', params: { code } });
    }, []),
  );

  return (
    <>
      {!emailVerified ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/auth/verifier')} style={styles.verifyBanner}>
          <Icon name="mail" color={colors.warningInk} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" style={{ color: colors.warningInk }}>
              Confirme ton adresse email
            </AppText>
            <AppText variant="caption" style={{ color: colors.warningInk }}>
              Saisis le code reçu à {email}
            </AppText>
          </View>
          <Icon name="chevronRight" color={colors.warningInk} size={18} />
        </Pressable>
      ) : null}

      {trips.isPending ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      ) : trips.isError ? (
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <AppText variant="heading">Impossible de charger tes voyages</AppText>
            <AppText tone="secondary">{trips.error.message}</AppText>
            <Button title="Réessayer" variant="soft" onPress={() => void trips.refetch()} />
          </View>
        </View>
      ) : trips.data.length === 0 ? (
        <View style={styles.card}>
          <RouteIllustration />
          <View style={styles.cardBody}>
            <AppText variant="heading">Aucun voyage pour l’instant</AppText>
            <AppText tone="secondary">
              Crée ton premier voyage avec juste un titre : la destination et les dates peuvent se décider plus tard, même
              par sondage.
            </AppText>
          </View>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(key)}
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.list}>
            {visible.map((trip) => (
              <TripCard key={trip.id} trip={trip} today={today} />
            ))}
            {visible.length === 0 ? (
              <AppText tone="secondary" style={styles.emptyFilter}>
                Aucun voyage dans cette catégorie.
              </AppText>
            ) : null}
          </View>
        </>
      )}

      <JoinLink />
    </>
  );
}

function VisitorContent() {
  const guestTrips = useGuestTrips();
  const today = localIsoDate();
  const trips = sortTrips(
    guestTrips.flatMap((query) => (query.data ? [query.data] : [])),
    today,
  );
  const loading = guestTrips.some((query) => query.isPending);

  if (trips.length > 0 || loading) {
    return (
      <>
        <View style={styles.list}>
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} today={today} />
          ))}
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
        </View>
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <AppText variant="heading">Tu voyages en invité</AppText>
            <AppText tone="secondary">
              Crée ton compte pour retrouver ces voyages sur tous tes appareils et créer les tiens. Tout ce que tu as fait reste.
            </AppText>
            <Button title="Créer mon compte" onPress={() => router.push('/auth')} />
            <Button title="J’ai déjà un compte" variant="soft" onPress={() => router.push('/auth')} />
          </View>
        </View>
        <JoinLink />
      </>
    );
  }

  return (
    <>
      <View style={styles.tooltip}>
        <AppText variant="caption" tone="inverse">
          Un compte est nécessaire pour créer un voyage.
        </AppText>
      </View>
      <View style={styles.card}>
        <RouteIllustration />
        <View style={styles.cardBody}>
          <AppText variant="heading">Ton prochain voyage commence ici</AppText>
          <AppText tone="secondary">Idées, sondages, planning, dépenses et documents : tout ton voyage au même endroit.</AppText>
          <Button title="Créer un compte" onPress={() => router.push('/auth')} />
          <Button title="J’ai déjà un compte" variant="soft" onPress={() => router.push('/auth')} />
        </View>
      </View>
      <View style={styles.inviteNote}>
        <Icon name="link" color={colors.inkSecondary} size={20} />
        <AppText variant="caption" tone="secondary" style={styles.flex}>
          Invité par un ami ? Ouvre simplement son lien : tu pourras rejoindre le voyage et voter sans créer de compte.
        </AppText>
      </View>
      <JoinLink />
    </>
  );
}

function JoinLink() {
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/rejoindre')} style={styles.joinLink}>
      <Icon name="link" color={colors.accentInk} size={18} />
      <AppText variant="bodyStrong" style={{ color: colors.accentInk }}>
        J’ai un lien d’invitation
      </AppText>
    </Pressable>
  );
}

function RouteIllustration() {
  return (
    <View style={styles.illustration}>
      <Svg width="100%" height="100%" viewBox="0 0 350 170" preserveAspectRatio="xMidYMid slice">
        <G fill="none" stroke="#B9D3C1" strokeWidth={1.5}>
          <Ellipse cx="80" cy="140" rx="120" ry="60" />
          <Ellipse cx="80" cy="140" rx="80" ry="38" />
          <Ellipse cx="290" cy="45" rx="90" ry="44" />
          <Ellipse cx="290" cy="45" rx="56" ry="24" />
        </G>
        <Path
          d="M70 130 C120 80 190 140 240 92 S290 56 290 56"
          fill="none"
          stroke={colors.accentInk}
          strokeWidth={3}
          strokeDasharray="2 9"
          strokeLinecap="round"
        />
        <Circle cx="70" cy="130" r="8" fill={colors.surface} stroke={colors.accentInk} strokeWidth={3} />
        <Path d="M290 70s16-15 16-27a16 16 0 0 0-32 0c0 12 16 27 16 27z" fill="#E0703C" />
        <Circle cx="290" cy="43" r="6" fill={colors.surface} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  signInPill: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E3DCCF',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C9C2B4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    maxWidth: 240,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.warningTint,
  },
  filters: { gap: spacing.sm },
  filter: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: radii.chip,
    backgroundColor: colors.chip,
    justifyContent: 'center',
  },
  filterActive: { backgroundColor: colors.ink },
  filterText: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.inkTertiary },
  filterTextActive: { fontFamily: fontFamily.semibold, color: colors.surface },
  list: { gap: spacing.md },
  emptyFilter: { textAlign: 'center', marginTop: spacing.lg },
  joinLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 44 },
  card: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' },
  illustration: { height: 170, backgroundColor: '#DCEADF' },
  cardBody: { padding: spacing.xl, gap: spacing.md },
  inviteNote: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xs },
});
