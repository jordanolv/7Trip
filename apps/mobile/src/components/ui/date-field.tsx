import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate, localIsoDate } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';


import { AppText } from './app-text';

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

/** Row showing an optional date; tapping it opens the native calendar. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  placeholder = 'Choisir',
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  minimumDate?: string | null;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = value ?? minimumDate ?? localIsoDate();

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${value ? formatDate(value) : 'non définie'}`}
          onPress={() => setOpen((o) => !o)}
          style={styles.main}
        >
          <AppText variant="bodyStrong">{label}</AppText>
          <AppText variant="bodyStrong" tone={value ? 'default' : 'accent'}>
            {value ? formatDate(value) : placeholder}
          </AppText>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Effacer ${label}`} onPress={() => onChange(null)} style={styles.clear}>
            <AppText variant="label" tone="secondary">
              Effacer
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={toDate(initial)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          locale="fr-FR"
          accentColor={colors.accent}
          minimumDate={minimumDate ? toDate(minimumDate) : undefined}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(localIsoDate(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { minHeight: 44, justifyContent: 'center', paddingLeft: spacing.md },
});
