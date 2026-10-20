import { updateTripRequestSchema, type TripDetail } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useAction } from '@/lib/use-action';
import { TripForm, type TripFormValues } from '@/trips/trip-form';
import { TripQueryState } from '@/trips/trip-query-state';
import { useTrip, useUpdateTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function ModifierVoyageScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <ModifierVoyage trip={trip} />}</TripQueryState>;
}

function ModifierVoyage({ trip }: { trip: TripDetail }) {
  const update = useUpdateTrip(trip.id);
  const [values, setValues] = useState<TripFormValues>({
    title: trip.title,
    destination: trip.destination ?? '',
    startDate: trip.startDate,
    endDate: trip.endDate,
    kind: trip.kind,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useAction(async () => {
    const parsed = updateTripRequestSchema.safeParse({ ...values, destination: values.destination || null });
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

  return (
    <>
      <ScreenHeader mode="close" title="Modifier le voyage" />
      <FormScreen footer={<Button title="Enregistrer" loading={save.loading} onPress={() => void save.run()} />}>
        <TripForm values={values} onChange={setValues} errors={{ ...save.fieldErrors, ...errors }} />
        {save.error ? (
          <AppText variant="caption" tone="danger">
            {save.error}
          </AppText>
        ) : null}
      </FormScreen>
    </>
  );
}
