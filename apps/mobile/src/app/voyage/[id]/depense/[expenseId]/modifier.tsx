import { ApiErrorCode, type Expense, type TripDetail } from '@7trip/shared';
import { colors } from '@7trip/ui-tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ExpenseForm, expenseFormErrors, expenseFormValues, expenseRequest, type ExpenseFormValues } from '@/finances/expense-form';
import { expensePeople, myParticipantId } from '@/finances/expense-people';
import { useExpense, useSaveExpense } from '@/finances/finances-api';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAction } from '@/lib/use-action';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function ModifierDepenseScreen() {
  const tripId = useTripId();
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useExpense(tripId, expenseId);
  const trip = useTrip(tripId);

  return (
    <>
      <ScreenHeader mode="close" title="Modifier la dépense" />
      {expense.data && trip.data ? (
        <ModifierDepense trip={trip.data} expense={expense.data} />
      ) : (
        <View style={styles.center}>
          {expense.isPending || trip.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <AppText tone="secondary">{(expense.error ?? trip.error)?.message}</AppText>
          )}
        </View>
      )}
    </>
  );
}

function ModifierDepense({ trip, expense }: { trip: TripDetail; expense: Expense }) {
  const save = useSaveExpense(trip.id, expense.id);
  const people = expensePeople(trip, expense);
  const meId = myParticipantId(trip);
  // The form keeps what was loaded when it opened: that is the version the changes are made on.
  const [values, setValues] = useState<ExpenseFormValues>(() => expenseFormValues(expense));
  const [version] = useState(expense.version);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = useAction(async () => {
    const found = expenseFormErrors(values, trip.baseCurrency);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await save.mutateAsync({ ...expenseRequest(values, trip.baseCurrency), version });
    } catch (error) {
      if (!(error instanceof ApiError && error.code === ApiErrorCode.EditConflict)) throw error;
      // The expense refreshes behind this screen: going back shows the other person's changes.
      Alert.alert('Dépense modifiée entre-temps', error.message, [{ text: 'Voir la dépense', onPress: () => router.back() }]);
      return;
    }
    haptics.success();
    router.back();
  });

  return (
    <FormScreen footer={<Button title="Enregistrer" loading={submit.loading} onPress={() => void submit.run()} />}>
      <ExpenseForm values={values} onChange={setValues} errors={{ ...submit.fieldErrors, ...errors }} people={people} meId={meId} tripId={trip.id} baseCurrency={trip.baseCurrency} />
      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
