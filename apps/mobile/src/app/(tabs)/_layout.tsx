import { colors } from '@7trip/ui-tokens';
import { Tabs } from 'expo-router';

import { TabBar, tabIcon } from '@/components/tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Voyages', tabBarIcon: tabIcon('suitcase') }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
