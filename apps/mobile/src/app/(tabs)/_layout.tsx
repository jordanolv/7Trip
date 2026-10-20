import { colors, fontFamily } from '@7trip/ui-tokens';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={24} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSecondary,
        tabBarActiveBackgroundColor: colors.accentTint,
        tabBarLabelStyle: { fontFamily: fontFamily.bold, fontSize: 12 },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 6, marginVertical: 6 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.chip,
          paddingHorizontal: 10,
          height: 88,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Voyages', tabBarIcon: tabIcon('suitcase') }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
