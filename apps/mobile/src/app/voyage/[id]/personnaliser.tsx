import { TRIP_COLORS, TRIP_ICONS, formatDestinations, localIsoDate, type TripColorKey, type TripDetail, type TripIconKey } from '@7trip/shared';
import { colors, radii, spacing, tripColors } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAction } from '@/lib/use-action';
import { formatDateRange } from '@/trips/format';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripCover, TripIcon, TripIconTile, tripColorNames, tripIconNames } from '@/trips/trip-visuals';
import { useTrip, useUpdateTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function PersonnaliserScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <Personnaliser trip={trip} />}</TripQueryState>;
}

function Personnaliser({ trip }: { trip: TripDetail }) {
  const { nouveau } = useLocalSearchParams<{ nouveau?: string }>();
  const justCreated = nouveau === '1';
  const insets = useSafeAreaInsets();
  const update = useUpdateTrip(trip.id);
  const [color, setColor] = useState<TripColorKey>(trip.color);
  const [icon, setIcon] = useState<TripIconKey>(trip.icon);

  const done = () => (justCreated ? router.replace(`/voyage/${trip.id}` as Href) : router.back());
  const save = useAction(async () => {
    await update.mutateAsync({ color, icon });
    done();
  });

  const dates = formatDateRange(trip.startDate, trip.endDate, localIsoDate());

  return (
    <>
      {justCreated ? (
        <View style={[styles.createdBar, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.createdBadge}>
            <Icon name="check" color={colors.accentInk} size={14} strokeWidth={3} />
            <AppText variant="label" style={{ color: colors.accentInk }}>
              Voyage créé
            </AppText>
          </View>
          <Pressable accessibilityRole="button" onPress={done} style={styles.later}>
            <AppText variant="bodyStrong" tone="secondary">
              Plus tard
            </AppText>
          </Pressable>
        </View>
      ) : (
        <ScreenHeader mode="close" title="Couleur et icône" />
      )}
      <FormScreen footer={<Button title="Terminer" loading={save.loading} onPress={() => void save.run()} />}>
        <AppText variant="title">Donne-lui son style</AppText>

        <View style={styles.preview}>
          <TripCover color={color} style={styles.previewCover} />
          <View style={styles.previewBody}>
            <View style={styles.previewTile}>
              <TripIconTile color={color} icon={icon} size={56} bordered />
            </View>
            <View style={styles.previewText}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {trip.title}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={2}>
                {[dates, formatDestinations(trip.destinations)].filter(Boolean).join(' · ') || 'Destination et dates à décider'}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="bodyStrong">Couverture</AppText>
          <View style={styles.covers}>
            <View style={[styles.coverOption, styles.coverSelected]}>
              <TripCover color={color} style={StyleSheet.absoluteFill} />
              <AppText variant="label">Motif 7Trip</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => Alert.alert('Bientôt', 'L’ajout de ta propre photo arrive avec les documents.')}
              style={[styles.coverOption, styles.coverDashed]}
            >
              <AppText variant="label">Ma photo</AppText>
            </Pressable>
            <View style={[styles.coverOption, styles.coverDisabled]}>
              <AppText variant="caption" tone="secondary" style={{ textAlign: 'center', fontSize: 11 }}>
                {/* Destination photos are not wired yet (needs a photo provider). */}
                {trip.destinations.length > 0
                  ? `Photos de ${trip.destinations[0]} bientôt`
                  : 'Suggestions dès que la destination est choisie'}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="bodyStrong">Couleur</AppText>
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {TRIP_COLORS.map((key) => {
              const selected = key === color;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={tripColorNames[key]}
                  accessibilityState={{ checked: selected }}
                  onPress={() => setColor(key)}
                  style={[styles.swatchRing, selected && styles.swatchRingSelected]}
                >
                  <View style={[styles.swatch, { backgroundColor: tripColors[key] }]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="bodyStrong">Icône</AppText>
          <View style={styles.icons} accessibilityRole="radiogroup">
            {TRIP_ICONS.map((key) => {
              const selected = key === icon;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={tripIconNames[key]}
                  accessibilityState={{ checked: selected }}
                  onPress={() => setIcon(key)}
                  style={[styles.iconCell, { backgroundColor: selected ? tripColors[color] : colors.surface }]}
                >
                  <TripIcon icon={key} size={22} color={selected ? colors.surface : colors.ink} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {save.error ? (
          <AppText variant="caption" tone="danger">
            {save.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  createdBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  createdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentTint,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  later: { minHeight: 44, justifyContent: 'center' },
  preview: { backgroundColor: colors.surface, borderRadius: radii.card, overflow: 'hidden' },
  previewCover: { height: 100 },
  // Only the icon tile overlaps the cover; the text stays entirely on the white part.
  previewBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 84,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg + 2,
  },
  previewTile: { marginTop: -28 },
  previewText: { flex: 1, gap: 2, paddingTop: spacing.sm + 2 },
  group: { gap: spacing.sm + 2 },
  covers: { flexDirection: 'row', gap: spacing.sm + 2 },
  coverOption: {
    flex: 1,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  coverSelected: { borderWidth: 2, borderColor: colors.ink, justifyContent: 'flex-end' },
  coverDashed: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C9C2B4', backgroundColor: colors.surface },
  coverDisabled: { backgroundColor: '#EFEAE1' },
  swatches: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  swatchRing: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  swatchRingSelected: { borderWidth: 2, borderColor: colors.ink },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  iconCell: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
