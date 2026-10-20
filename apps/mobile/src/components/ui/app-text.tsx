import { colors, fontFamily } from '@7trip/ui-tokens';
import { StyleSheet, Text, type TextProps } from 'react-native';

type Variant = 'logo' | 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';
type Tone = 'default' | 'secondary' | 'accent' | 'danger' | 'inverse';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

export function AppText({ variant = 'body', tone = 'default', style, ...props }: AppTextProps) {
  return <Text {...props} style={[styles[variant], toneStyles[tone], style]} />;
}

const styles = StyleSheet.create({
  logo: { fontFamily: fontFamily.logo, fontSize: 30, letterSpacing: -0.9 },
  display: { fontFamily: fontFamily.extrabold, fontSize: 30, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.extrabold, fontSize: 24, letterSpacing: -0.5 },
  heading: { fontFamily: fontFamily.extrabold, fontSize: 18 },
  body: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fontFamily.bold, fontSize: 13 },
});

const toneStyles = StyleSheet.create({
  default: { color: colors.ink },
  secondary: { color: colors.inkSecondary },
  accent: { color: colors.accent },
  danger: { color: colors.danger },
  inverse: { color: colors.surface },
});
