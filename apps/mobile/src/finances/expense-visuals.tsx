import type { ExpenseCategory } from '@7trip/shared';
import { colors, tripIconPaths } from '@7trip/ui-tokens';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Tint, ink and stroke icon of each category; no category: a coin. */
const CATEGORY_STYLES: Record<ExpenseCategory | 'NONE', { tint: string; ink: string; path: string }> = {
  FOOD: { tint: '#FBE6D8', ink: '#8A3D12', path: tripIconPaths.food },
  ACTIVITY: { tint: colors.accentTint, ink: colors.accentInk, path: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10' },
  TRANSPORT: { tint: '#C8E0EA', ink: '#1F5F7A', path: tripIconPaths.car },
  LODGING: { tint: '#F1E2B8', ink: '#7A5A08', path: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  GROCERIES: { tint: '#E4E6F7', ink: '#3E46A0', path: 'M3 4h2l2.4 11h11.2L21 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z' },
  SHOPPING: { tint: '#F1CFDE', ink: '#8E2A57', path: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2' },
  OTHER: { tint: colors.chipSoft, ink: colors.inkTertiary, path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1.1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.4-5 1.4-5 3.9 0 1.1 1.1 1.8 2.5 1.8s2.5-.6 2.5-1.5' },
  NONE: { tint: colors.chipSoft, ink: colors.inkTertiary, path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1.1-1.5 2.5-1.5s2.5.7 2.5 1.8c0 2.4-5 1.4-5 3.9 0 1.1 1.1 1.8 2.5 1.8s2.5-.6 2.5-1.5' },
};

export function ExpenseCategoryIcon({ category, size = 20, color }: { category: ExpenseCategory | null; size?: number; color?: string }) {
  const style = CATEGORY_STYLES[category ?? 'NONE'];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? style.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={style.path} />
    </Svg>
  );
}

export function ExpenseCategoryTile({ category, size = 44 }: { category: ExpenseCategory | null; size?: number }) {
  const style = CATEGORY_STYLES[category ?? 'NONE'];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.27, backgroundColor: style.tint }]}>
      <ExpenseCategoryIcon category={category} size={size * 0.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
