import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_PADDING_TOP = 14;

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={24} />;
  };
}

/** Tab bar from the mockups: each tab is a full-height pill, tinted when active. */
function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  return (
    // The home indicator only needs part of the bottom inset: give back the rest so the pills sit
    // visually centred in the bar, while staying clear of the indicator.
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom - BAR_PADDING_TOP, BAR_PADDING_TOP) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.inkSecondary;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={onPress}
            style={[styles.item, focused && styles.itemActive]}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text style={[styles.label, { color }, focused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: BAR_PADDING_TOP,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.chip,
  },
  item: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: { backgroundColor: colors.accentTint },
  label: { fontFamily: fontFamily.medium, fontSize: 12 },
  labelActive: { fontFamily: fontFamily.bold },
});
