import { colors } from '@7trip/ui-tokens';
import { Stack, useLocalSearchParams } from 'expo-router';

import { TripIdProvider } from '@/trips/use-trip-id';

export default function VoyageLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TripIdProvider value={id}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(onglets)" />
        <Stack.Screen name="personnaliser" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modifier" options={{ presentation: 'modal' }} />
        <Stack.Screen name="inviter" options={{ presentation: 'modal' }} />
        <Stack.Screen name="parametres" options={{ presentation: 'modal' }} />
      </Stack>
    </TripIdProvider>
  );
}
