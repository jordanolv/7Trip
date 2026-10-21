import type { TripDetail } from '@7trip/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { errorMessage } from '@/lib/api';

import { tripKeys, useDeleteTrip } from './trips-api';

/** Asks for confirmation, deletes, then goes back to "Mes voyages". */
export function useConfirmDeleteTrip(trip: Pick<TripDetail, 'id' | 'title'>) {
  const remove = useDeleteTrip(trip.id);
  const client = useQueryClient();

  const run = async () => {
    try {
      await remove.mutateAsync();
      router.dismissTo('/');
      // After leaving, so the trip screens do not flash "Voyage introuvable".
      client.removeQueries({ queryKey: tripKeys.detail(trip.id) });
    } catch (error) {
      Alert.alert('Suppression impossible', errorMessage(error));
    }
  };

  return () =>
    Alert.alert(`Supprimer « ${trip.title} » ?`, 'Le voyage sera supprimé pour tous les participants. C’est définitif.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void run() },
    ]);
}
