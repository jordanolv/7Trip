import { colors } from '@7trip/ui-tokens';
import { Stack, useLocalSearchParams } from 'expo-router';

import { sheetOptions } from '@/components/sheet';
import { TripIdProvider } from '@/trips/use-trip-id';

// A screen of the trip opened from outside (the list, a link) keeps the trip under it.
export const unstable_settings = { initialRouteName: '(onglets)' };

export default function VoyageLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TripIdProvider value={id}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(onglets)" />
        <Stack.Screen name="personnaliser" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modifier" options={{ presentation: 'modal' }} />
        <Stack.Screen name="inviter" options={sheetOptions} />
        <Stack.Screen name="parametres" options={{ presentation: 'modal' }} />
        <Stack.Screen name="idee/nouvelle" options={{ presentation: 'modal' }} />
        <Stack.Screen name="idee/[ideaId]/index" />
        <Stack.Screen name="idee/[ideaId]/modifier" options={{ presentation: 'modal' }} />
        <Stack.Screen name="idee/[ideaId]/planifier" options={sheetOptions} />
        <Stack.Screen name="evenement/nouveau" options={{ presentation: 'modal' }} />
        <Stack.Screen name="evenement/depuis-idee" options={{ presentation: 'modal' }} />
        <Stack.Screen name="evenement/[eventId]/index" />
        <Stack.Screen name="evenement/[eventId]/modifier" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sondages" />
        <Stack.Screen name="sondage/nouveau" options={{ presentation: 'modal' }} />
        <Stack.Screen name="depense/nouvelle" options={{ presentation: 'modal' }} />
        <Stack.Screen name="depense/[expenseId]/index" options={sheetOptions} />
        <Stack.Screen name="depense/[expenseId]/modifier" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sondage/[pollId]/index" />
        <Stack.Screen name="sondage/[pollId]/partager" options={sheetOptions} />
      </Stack>
    </TripIdProvider>
  );
}
