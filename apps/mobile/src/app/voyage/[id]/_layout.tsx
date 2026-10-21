import { colors } from '@7trip/ui-tokens';
import { Stack } from 'expo-router';

export default function VoyageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(onglets)" />
      <Stack.Screen name="personnaliser" options={{ presentation: 'modal' }} />
      <Stack.Screen name="modifier" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
