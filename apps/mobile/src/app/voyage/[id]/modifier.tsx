import { localIsoDate, updateTripRequestSchema, type CurrencyCode, type TripColorKey, type TripDetail, type TripIconKey } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAction } from '@/lib/use-action';
import { TripForm, cleanDestinations, type TripFormValues } from '@/trips/trip-form';
import { TripPreviewCard } from '@/trips/trip-preview-card';
import { TripQueryState } from '@/trips/trip-query-state';
import { TripStylePicker } from '@/trips/trip-style-picker';
import { useTrip, useUpdateTrip } from '@/trips/trips-api';
import { useConfirmDeleteTrip } from '@/trips/use-confirm-delete-trip';
import { useTripId } from '@/trips/use-trip-id';

export default function ModifierVoyageScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <ModifierVoyage trip={trip} />}</TripQueryState>;
}

/** Everything about the trip in one place: details, colour and icon, and deletion. */
function ModifierVoyage({ trip }: { trip: TripDetail }) {
  const update = useUpdateTrip(trip.id);
  const confirmDelete = useConfirmDeleteTrip(trip);
  const [values, setValues] = useState<TripFormValues>({
    title: trip.title,
    destinations: trip.destinations,
    startDate: trip.startDate,
    endDate: trip.endDate,
    kind: trip.kind,
    baseCurrency: trip.baseCurrency as CurrencyCode,
  });
  const [color, setColor] = useState<TripColorKey>(trip.color);
  const [icon, setIcon] = useState<TripIconKey>(trip.icon);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAction(async () => {
    const parsed = updateTripRequestSchema.safeParse({ ...values, destinations: cleanDestinations(values.destinations), color, icon });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    await update.mutateAsync(parsed.data);
    router.back();
  });

  if (trip.myRole !== 'ORGANIZER') {
    return (
      <>
        <ScreenHeader mode="close" title="Le voyage" />
        <FormScreen>
          <AppText tone="secondary">Seuls les organisateurs peuvent modifier le voyage.</AppText>
        </FormScreen>
      </>
    );
  }

  const preview: TripDetail = {
    ...trip,
    title: values.title.trim() || trip.title,
    destinations: cleanDestinations(values.destinations),
    startDate: values.startDate,
    endDate: values.endDate,
  };

  return (
    <>
      <ScreenHeader mode="close" title="Modifier le voyage" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <TripPreviewCard trip={preview} color={color} icon={icon} today={localIsoDate()} />
        <TripForm values={values} onChange={setValues} errors={{ ...save.fieldErrors, ...errors }} currencyLocked={trip.currencyLocked} />

        <View style={styles.section}>
          <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
            STYLE
          </AppText>
          <TripStylePicker color={color} icon={icon} onColorChange={setColor} onIconChange={setIcon} />
        </View>

        <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
          <Icon name="trash" color={colors.danger} size={20} />
          <AppText variant="bodyStrong" style={{ color: colors.danger }}>
            Supprimer le voyage
          </AppText>
        </Pressable>

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
  section: { gap: spacing.md },
  sectionTitle: { letterSpacing: 0.8 },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.dangerTint,
  },
});
