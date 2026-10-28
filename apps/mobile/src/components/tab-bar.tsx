import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { Icon, type IconName } from './ui/icon';

export type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const BAR_PADDING_TOP = 14;

export function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} color={color} size={24} />;
  };
}

/** Tab bar from the mockups: each tab is a full-height pill, tinted when active. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const compact = state.routes.length > 3;
  return (
    // The home indicator only needs part of the bottom inset: give back the rest so the pills sit
    // visually centred in the bar, while staying clear of the indicator.
    <View
      style={[
        styles.bar,
        compact && styles.barCompact,
        { paddingBottom: Math.max(insets.bottom - BAR_PADDING_TOP, BAR_PADDING_TOP) },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]!;
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.inkSecondary;
        const label = options.title ?? route.name;
        const badge = options.tabBarBadge;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${label}, ${badge} nouveau${badge === 1 ? '' : 'x'}` : label}
            onPress={onPress}
            style={[styles.item, focused && styles.itemActive]}
          >
            <View>
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{typeof badge === 'number' && badge > 9 ? '9+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={[styles.label, compact && styles.labelCompact, { color }, focused && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: BAR_PADDING_TOP,
    // Wide enough for the end pills to clear the rounded corners of the screen.
    paddingHorizontal: spacing.lg + 2,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.chip,
  },
  barCompact: { gap: spacing.xs },
  item: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3 },
  itemActive: { backgroundColor: colors.accentTint },
  label: { fontFamily: fontFamily.medium, fontSize: 12 },
  labelCompact: { fontSize: 11 },
  labelActive: { fontFamily: fontFamily.bold },
  badge: {
    position: 'absolute',
    top: -5,
    left: 15,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fontFamily.bold, fontSize: 10, lineHeight: 12, color: colors.surface },
});
