import { colors, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './ui/app-text';
import { Icon, type IconName } from './ui/icon';

/** A menu line: tinted icon, label, chevron. Danger lines are red and lead nowhere, so no chevron. */
export function ActionRow({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, danger && styles.iconDanger]}>
        <Icon name={icon} color={danger ? colors.danger : colors.accentInk} size={18} />
      </View>
      <AppText variant="bodyStrong" style={[styles.label, danger && { color: colors.danger }]}>
        {label}
      </AppText>
      {danger ? null : <Icon name="chevronRight" color={colors.inkSecondary} size={18} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.lg - 2 },
  pressed: { opacity: 0.6 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDanger: { backgroundColor: colors.dangerTint },
  label: { flex: 1 },
});
