import { colors } from '@7trip/ui-tokens';
import { Tabs } from 'expo-router';

import { TabBar, tabIcon } from '@/components/tab-bar';
import { useUnseenIdeas } from '@/ideas/ideas-api';
import { useTripId } from '@/trips/use-trip-id';

/** In-trip navigation (CDC §3.2): opening a trip always lands on its dashboard. */
export default function VoyageTabsLayout() {
  const unseenIdeas = useUnseenIdeas(useTripId()).data?.count ?? 0;
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="planning" options={{ title: 'Planning', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="idees" options={{ title: 'Idées', tabBarIcon: tabIcon('idea'), tabBarBadge: unseenIdeas || undefined }} />
      <Tabs.Screen name="finances" options={{ title: 'Finances', tabBarIcon: tabIcon('coins') }} />
      <Tabs.Screen name="plus" options={{ title: 'Plus', tabBarIcon: tabIcon('more') }} />
    </Tabs>
  );
}
