import { formatMoney, type TripBalances, type TripDetail } from '@7trip/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { financeKeys } from '@/finances/finances-api';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';

import { forgetTripContent, tripKeys, useLeaveTrip } from './trips-api';

/**
 * Asks for confirmation, leaves, then goes back to "Mes voyages". With money still owed either way,
 * the confirmation says so first (docs/decisions.md: no leaving with a balance without a warning).
 */
export function useConfirmLeaveTrip(trip: Pick<TripDetail, 'id' | 'title'>) {
  const leave = useLeaveTrip(trip.id);
  const client = useQueryClient();
  const { tripRequest } = useAuth();

  const run = async () => {
    try {
      await leave.mutateAsync();
      router.dismissTo('/');
      client.removeQueries({ queryKey: tripKeys.detail(trip.id) });
      forgetTripContent(client, trip.id);
    } catch (error) {
      Alert.alert('Impossible de quitter', errorMessage(error));
    }
  };

  return async () => {
    haptics.warning();
    // Fresh balances: without them (offline…), leaving is still possible, with the usual warning.
    const balances = await client
      .fetchQuery({
        queryKey: financeKeys.balances(trip.id),
        queryFn: () => tripRequest<TripBalances>(trip.id, `/trips/${trip.id}/balances`),
        staleTime: 0,
      })
      .catch(() => null);
    const balance = balances?.me.balanceMinor ?? 0;
    const money = balances ? formatMoney(Math.abs(balance), balances.currency) : '';
    const owed =
      balance < 0
        ? `Tu dois encore ${money} au groupe : règle-le avant de partir. `
        : balance > 0
          ? `Le groupe te doit encore ${money} : pense à te faire rembourser avant de partir. `
          : '';
    Alert.alert(`Quitter « ${trip.title} » ?`, `${owed}Tu n’y auras plus accès. Ce que tu as ajouté reste visible des autres.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => void run() },
    ]);
  };
}
