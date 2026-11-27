import { portfolioTripLabel, type TripSummary } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { TripCover, TripIcon } from '@/trips/trip-visuals';

import { AppText } from './ui/app-text';

// The pieces of the portfolio tab (src/app/(tabs)/portfolio.tsx).

export function Card({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <AppText variant="heading">{title}</AppText>
      <AppText tone="secondary">{text}</AppText>
      {children}
    </View>
  );
}

export function Stat({ value, label }: { value: number; label: string }) {
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

export function VisitedMap({ places }: { places: string[] }) {
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

export function PortfolioCard({ trip, days }: { trip: TripSummary; days: number }) {
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
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  map: { height: 190, borderRadius: 24, backgroundColor: '#DCEADF', overflow: 'hidden' },
  pinLabel: { position: 'absolute', maxWidth: 120, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  pinText: { fontSize: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  tripCard: { width: '48.3%', backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  cover: { height: 100 },
  coverIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tripText: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 2 },
});
