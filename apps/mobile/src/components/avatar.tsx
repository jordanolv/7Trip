import { colors, fontFamily } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <View
      accessibilityLabel={name}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: '#D9E8DF', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fontFamily.bold, color: colors.accentInk },
});
