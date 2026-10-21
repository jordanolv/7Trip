/** Design tokens from the V1 mockups (direction "G"). See docs/maquettes/README.md. */

export const colors = {
  background: '#F7F3EC',
  surface: '#FFFFFF',
  ink: '#1B2433',
  inkSecondary: '#5E6675',
  inkTertiary: '#3A4352',
  accent: '#2F7A5D',
  accentTint: '#E3EFE8',
  accentInk: '#22553F',
  chip: '#EDE7DC',
  chipSoft: '#F2EDE4',
  separator: '#EEE8DD',
  border: '#D9D2C4',
  warningTint: '#FBE6D8',
  warningInk: '#8A3D12',
  infoTint: '#FBEBD0',
  infoInk: '#6B3F08',
  danger: '#A12C1C',
  dangerTint: '#F7E1DC',
  topoLine: '#ECE4D6',
} as const;

/** Per-trip identity colours (trip icon tile). */
export const tripColors = {
  orange: '#E0703C',
  forest: '#2F7A5D',
  lagoon: '#1F6F8B',
  raspberry: '#C2417A',
  lavender: '#5B4B8A',
  mustard: '#B8860B',
} as const;

export type TripColor = keyof typeof tripColors;

export const radii = {
  chip: 999,
  button: 16,
  card: 20,
  sheet: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
  logo: 'PlusJakartaSans_800ExtraBold_Italic',
} as const;

/** Minimum touch target, in points. */
export const minTouchTarget = 44;
