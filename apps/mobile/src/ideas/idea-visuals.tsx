import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS, type Idea, type IdeaCategory, type IdeaStatus } from '@7trip/shared';
import { colors, fontFamily, radii, tripIconPaths } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** The idea bulb, for uncategorised ideas. */
const BULB = 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z';

/** Tint, ink and stroke icon of each category (colours from the idea box mockup). */
const CATEGORY_STYLES: Record<IdeaCategory | 'NONE', { tint: string; ink: string; path: string }> = {
  ACTIVITY: { tint: '#C8E0EA', ink: '#1F5F7A', path: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10' },
  FOOD: { tint: '#FBE6D8', ink: '#8A3D12', path: tripIconPaths.food },
  WALK: { tint: colors.accentTint, ink: colors.accentInk, path: 'M9 4l-5 2v14l5-2 6 2 5-2V4l-5 2zM9 4v14M15 6v14' },
  BEACH: { tint: '#F1E2B8', ink: '#7A5A08', path: tripIconPaths.sun },
  CULTURE: { tint: '#DCD6EC', ink: '#4A3C75', path: tripIconPaths.city },
  NIGHTLIFE: { tint: '#F1CFDE', ink: '#8E2A57', path: 'M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v7M8 21h8' },
  OTHER: { tint: colors.chipSoft, ink: colors.inkTertiary, path: BULB },
  NONE: { tint: colors.chipSoft, ink: colors.inkTertiary, path: BULB },
};

export const categoryStyle = (category: IdeaCategory | null) => CATEGORY_STYLES[category ?? 'NONE'];

export function CategoryIcon({ category, size = 22, color }: { category: IdeaCategory | null; size?: number; color?: string }) {
  const style = categoryStyle(category);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? style.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={style.path} />
    </Svg>
  );
}

/** Square tile standing in for the idea's photo (photos come with documents, step 7). */
export function CategoryTile({ category, size = 60 }: { category: IdeaCategory | null; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.23, backgroundColor: categoryStyle(category).tint }]}>
      <CategoryIcon category={category} size={size * 0.4} />
    </View>
  );
}

const STATUS_COLORS: Record<IdeaStatus, { bg: string; fg: string }> = {
  PROPOSED: { bg: colors.chipSoft, fg: colors.inkTertiary },
  KEPT: { bg: colors.accentTint, fg: colors.accentInk },
};

export function IdeaStatusChip({ status }: { status: IdeaStatus }) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{IDEA_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  chip: { borderRadius: radii.chip, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: fontFamily.bold, fontSize: 11 },
});

/** "Balade · Gratuit", or the place when there is nothing else to say. */
export function ideaMeta(idea: Idea): string | null {
  const parts = [idea.category ? IDEA_CATEGORY_LABELS[idea.category] : null, idea.cost].filter(Boolean);
  return parts.length ? parts.join(' · ') : idea.place;
}
