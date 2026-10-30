import type { TripDetail, TripEvent } from '@7trip/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { useEvent } from '@/events/events-api';
import { ExpenseForm, expenseFormErrors, expenseRequest, newExpenseForm, type ExpenseFormValues } from '@/finances/expense-form';
import { expensePeople, myParticipantId } from '@/finances/expense-people';
import { useSaveExpense } from '@/finances/finances-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { TripQueryState } from '@/trips/trip-query-state';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

/** `?evenement=<id>`: added from a planning item, already linked to it. */
export default function NouvelleDepenseScreen() {
  const tripId = useTripId();
  const trip = useTrip(tripId);
  const { evenement } = useLocalSearchParams<{ evenement?: string }>();
  return (
    <>
      <ScreenHeader mode="close" title="Nouvelle dépense" />
      <TripQueryState query={trip}>
        {(data) => (evenement ? <FromEvent trip={data} eventId={evenement} /> : <NouvelleDepense trip={data} event={null} />)}
      </TripQueryState>
    </>
  );
}

function FromEvent({ trip, eventId }: { trip: TripDetail; eventId: string }) {
  const event = useEvent(trip.id, eventId);
  // Deleted meanwhile: a plain new expense.
  if (event.isPending) return <ActivityIndicator color={colors.accent} style={styles.loading} />;
  return <NouvelleDepense trip={trip} event={event.data ?? null} />;
}

function NouvelleDepense({ trip, event }: { trip: TripDetail; event: TripEvent | null }) {
  const save = useSaveExpense(trip.id);
  const people = expensePeople(trip);
  const meId = myParticipantId(trip);
  const [values, setValues] = useState<ExpenseFormValues>(() => newExpenseForm(people, meId, trip.baseCurrency, event));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const found = expenseFormErrors(values, trip.baseCurrency);
    setErrors(found);
    if (Object.keys(found).length) return;
    await save.mutateAsync(expenseRequest(values, trip.baseCurrency));
    haptics.success();
    router.back();
  });

  return (
    <FormScreen footer={<Button title="Ajouter la dépense" loading={submit.loading} onPress={() => void submit.run()} />}>
      <ExpenseForm values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} people={people} meId={meId} tripId={trip.id} baseCurrency={trip.baseCurrency} autoFocus />
      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({ loading: { marginTop: spacing.xxl } });
