import { avatarColors, fontFamily, type AvatarColorKey } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Initials on the person's colour (chosen in their profile, or derived from their id). */
export function Avatar({ name, color = 'sage', size = 44 }: { name: string; color?: AvatarColorKey; size?: number }) {
  const tint = avatarColors[color];
  return (
    <View
      accessibilityLabel={name}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg }]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34, color: tint.ink }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fontFamily.bold },
});
