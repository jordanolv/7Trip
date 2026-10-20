import { createTripRequestSchema } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAction } from '@/lib/use-action';
import { TripForm, cleanDestinations, type TripFormValues } from '@/trips/trip-form';
import { useCreateTrip } from '@/trips/trips-api';

export default function NouveauVoyageScreen() {
  const createTrip = useCreateTrip();
  const [values, setValues] = useState<TripFormValues>({
    title: '',
    destinations: [],
    startDate: null,
    endDate: null,
    kind: 'GROUP',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const parsed = createTripRequestSchema.safeParse({ ...values, destinations: cleanDestinations(values.destinations) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    const trip = await createTrip.mutateAsync(parsed.data);
    router.replace({ pathname: '/voyage/[id]/personnaliser', params: { id: trip.id, nouveau: '1' } });
  });

  return (
    <>
      <ScreenHeader mode="close" title="Nouveau voyage" />
      <FormScreen footer={<Button title="Créer le voyage" loading={submit.loading} onPress={() => void submit.run()} />}>
        <TripForm values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} autoFocusTitle />
        <View style={styles.tip}>
          <Icon name="map" color={colors.infoInk} size={20} />
          <AppText variant="caption" style={styles.tipText}>
            Astuce : une fois le voyage créé, lance un sondage pour choisir la destination et les dates avec tout le monde.
          </AppText>
        </View>
        {submit.error ? (
          <AppText variant="caption" tone="danger">
            {submit.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.infoTint,
    borderRadius: 16,
    padding: spacing.md + 2,
  },
  tipText: { flex: 1, color: colors.infoInk },
});
