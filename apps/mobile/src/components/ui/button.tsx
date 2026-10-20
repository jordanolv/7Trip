import { colors, fontFamily, minTouchTarget, radii } from '@7trip/ui-tokens';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'soft' | 'dark' | 'ghost';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, accessibilityHint }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColors[variant]} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: labelColors[variant] }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget + 8,
    borderRadius: radii.button,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fontFamily.bold, fontSize: 16 },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  soft: { backgroundColor: colors.background },
  dark: { backgroundColor: '#111111' },
  ghost: { backgroundColor: 'transparent' },
});

const labelColors: Record<Variant, string> = {
  primary: colors.surface,
  secondary: colors.ink,
  soft: colors.ink,
  dark: colors.surface,
  ghost: colors.inkTertiary,
};
