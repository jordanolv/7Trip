import { colors, fontFamily } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: '#F2EDE4', borderRadius: 12, padding: 3 },
  segment: { minHeight: 38, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkSecondary },
  labelActive: { fontFamily: fontFamily.bold, color: colors.ink },
});
