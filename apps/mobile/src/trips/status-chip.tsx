import { tripBadge, tripPhase, type TripSummary } from '@7trip/shared';
import { colors, fontFamily, radii } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';


type Tone = 'upcoming' | 'ongoing' | 'past' | 'undated';

/** "Dans 12 jours", "En cours · J2", "Terminé", "Dates à décider". */
export function TripStatusChip({ trip, today }: { trip: Pick<TripSummary, 'startDate' | 'endDate'>; today: string }) {
  const tone: Tone = trip.startDate ? tripPhase(trip, today) : 'undated';
  return (
    <View style={[styles.chip, chipStyles[tone]]}>
      <Text style={[styles.text, textStyles[tone]]}>{tripBadge(trip, today)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: radii.chip, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontFamily: fontFamily.semibold, fontSize: 12 },
});

const chipStyles = StyleSheet.create({
  upcoming: { backgroundColor: colors.accentTint },
  ongoing: { backgroundColor: colors.accent },
  past: { backgroundColor: colors.chip },
  undated: { backgroundColor: colors.warningTint },
});

const textStyles = StyleSheet.create({
  upcoming: { color: colors.accentInk },
  ongoing: { color: colors.surface },
  past: { color: colors.inkTertiary },
  undated: { color: colors.warningInk },
});
