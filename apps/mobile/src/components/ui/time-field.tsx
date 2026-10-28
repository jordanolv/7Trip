import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const toDate = (time: string) => {
  const date = new Date();
  date.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  return date;
};
const toTime = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** A "Début 18:00" tile; tapping it opens the native time wheel. */
export function TimeField({
  label,
  value,
  onChange,
  fallback,
  placeholder = '—',
}: {
  label: string;
  value: string | null;
  onChange: (time: string) => void;
  /** Where the wheel starts when there is no value yet. */
  fallback: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.flex}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value ?? 'non précisée'}`}
        onPress={() => setOpen((o) => !o)}
        style={[styles.tile, open && styles.tileOpen]}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !value && styles.placeholder]}>{value ?? placeholder}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(value ?? fallback)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          locale="fr-FR"
          is24Hour
          minuteInterval={5}
          accentColor={colors.accent}
          onValueChange={(_, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            onChange(toTime(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tile: { backgroundColor: colors.background, borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 2, borderColor: 'transparent' },
  tileOpen: { borderColor: colors.accent },
  label: { fontFamily: fontFamily.semibold, fontSize: 11, color: colors.inkSecondary },
  value: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.ink },
  placeholder: { color: colors.inkSecondary },
});
