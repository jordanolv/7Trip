import { EVENT_CATEGORY_LABELS, authorName, formatDayMonth, weekday, type EventCategory, type TripEvent } from '@7trip/shared';
import { colors, fontFamily, radii, tripIconPaths } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Edge colour, tint, ink and stroke icon of each category (from the planning mockup). */
const CATEGORY_STYLES: Record<EventCategory, { edge: string; tint: string; ink: string; path: string }> = {
  ACTIVITY: { edge: colors.accent, tint: colors.accentTint, ink: colors.accentInk, path: 'M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10' },
  FOOD: { edge: '#E0703C', tint: '#FBE6D8', ink: '#8A3D12', path: tripIconPaths.food },
  TRANSPORT: { edge: '#1F6F8B', tint: '#C8E0EA', ink: '#1F5F7A', path: 'M6 4h12v11H6zM6 10h12M9 18l-2 3M15 18l2 3M9 15h.01M15 15h.01' },
  LODGING: { edge: '#5B4B8A', tint: '#EEEAF6', ink: '#4B3F7A', path: 'M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 9a2 2 0 1 0 0 4 2 2 0 1 0 0-4z' },
  OTHER: { edge: colors.inkSecondary, tint: colors.chipSoft, ink: colors.inkTertiary, path: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8a2 2 0 1 0 0 4 2 2 0 1 0 0-4z' },
};

export const eventStyle = (category: EventCategory) => CATEGORY_STYLES[category];

export function EventIcon({ category, size = 20, color }: { category: EventCategory; size?: number; color?: string }) {
  const style = eventStyle(category);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? style.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={style.path} />
    </Svg>
  );
}

export function EventCategoryChip({ category }: { category: EventCategory }) {
  const { tint, ink } = eventStyle(category);
  return (
    <View style={[styles.chip, { backgroundColor: tint }]}>
      <Text style={[styles.chipText, { color: ink }]}>{EVENT_CATEGORY_LABELS[category]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: radii.chip, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: fontFamily.bold, fontSize: 12 },
});

/** "Tout le groupe", "Léa, Thomas", "Léa, Camille +2". */
export function eventPeople(event: Pick<TripEvent, 'participants'>): string {
  if (event.participants.length === 0) return 'Tout le groupe';
  const names = event.participants.map(authorName);
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

/** "lundi 20 oct.", or "du 19 au 22 oct." for a multi-day event. */
export function eventDays(event: Pick<TripEvent, 'startDate' | 'endDate'>): string {
  if (!event.endDate) return `${weekday(event.startDate)} ${formatDayMonth(event.startDate)}`;
  const sameMonth = event.startDate.slice(0, 7) === event.endDate.slice(0, 7);
  const start = sameMonth ? String(Number(event.startDate.slice(8, 10))) : formatDayMonth(event.startDate);
  return `du ${start} au ${formatDayMonth(event.endDate)}`;
}
