import type { TripDetail } from '@7trip/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';

import { tripKeys, useLeaveTrip } from './trips-api';

/** Asks for confirmation, leaves, then goes back to "Mes voyages". */
export function useConfirmLeaveTrip(trip: Pick<TripDetail, 'id' | 'title'>) {
  const leave = useLeaveTrip(trip.id);
  const client = useQueryClient();

  const run = async () => {
    try {
      await leave.mutateAsync();
      router.dismissTo('/');
      client.removeQueries({ queryKey: tripKeys.detail(trip.id) });
    } catch (error) {
      Alert.alert('Impossible de quitter', errorMessage(error));
    }
  };

  return () => {
    haptics.warning();
    Alert.alert(`Quitter « ${trip.title} » ?`, 'Tu n’y auras plus accès. Ce que tu as ajouté reste visible des autres.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: () => void run() },
    ]);
  };
}
