import { TRIP_COLORS, TRIP_ICONS, type TripColorKey, type TripIconKey } from '@7trip/shared';
import { colors, spacing, tripColors } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

import { TripIcon, tripColorNames, tripIconNames } from './trip-visuals';

/** Colour swatches + icon grid, shared by the "personnaliser" and "modifier" screens. */
export function TripStylePicker({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: TripColorKey;
  icon: TripIconKey;
  onColorChange: (color: TripColorKey) => void;
  onIconChange: (icon: TripIconKey) => void;
}) {
  return (
    <>
      <View style={styles.group}>
        <AppText variant="bodyStrong">Couleur</AppText>
        <View style={styles.swatches} accessibilityRole="radiogroup">
          {TRIP_COLORS.map((key) => {
            const selected = key === color;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={tripColorNames[key]}
                accessibilityState={{ checked: selected }}
                onPress={() => onColorChange(key)}
                style={[styles.swatchRing, selected && styles.swatchRingSelected]}
              >
                <View style={[styles.swatch, { backgroundColor: tripColors[key] }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="bodyStrong">Icône</AppText>
        <View style={styles.icons} accessibilityRole="radiogroup">
          {TRIP_ICONS.map((key) => {
            const selected = key === icon;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityLabel={tripIconNames[key]}
                accessibilityState={{ checked: selected }}
                onPress={() => onIconChange(key)}
                style={[styles.iconCell, { backgroundColor: selected ? tripColors[color] : colors.surface }]}
              >
                <TripIcon icon={key} size={22} color={selected ? colors.surface : colors.ink} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm + 2 },
  swatches: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  swatchRing: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  swatchRingSelected: { borderWidth: 2, borderColor: colors.ink },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  iconCell: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
