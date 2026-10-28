import type { TripDetail } from '@7trip/shared';
import { router } from 'expo-router';
import { useState } from 'react';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ExpenseForm, expenseFormErrors, expenseRequest, newExpenseForm, type ExpenseFormValues } from '@/finances/expense-form';
import { expensePeople, myParticipantId } from '@/finances/expense-people';
import { useSaveExpense } from '@/finances/finances-api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { TripQueryState } from '@/trips/trip-query-state';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function NouvelleDepenseScreen() {
  const tripId = useTripId();
  const trip = useTrip(tripId);
  return (
    <>
      <ScreenHeader mode="close" title="Nouvelle dépense" />
      <TripQueryState query={trip}>{(data) => <NouvelleDepense trip={data} />}</TripQueryState>
    </>
  );
}

function NouvelleDepense({ trip }: { trip: TripDetail }) {
  const save = useSaveExpense(trip.id);
  const people = expensePeople(trip);
  const meId = myParticipantId(trip);
  const [values, setValues] = useState<ExpenseFormValues>(() => newExpenseForm(people, meId));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const found = expenseFormErrors(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    await save.mutateAsync(expenseRequest(values));
    haptics.success();
    router.back();
  });

  return (
    <FormScreen footer={<Button title="Ajouter la dépense" loading={submit.loading} onPress={() => void submit.run()} />}>
      <ExpenseForm values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} people={people} meId={meId} autoFocus />
      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}
