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

/** Light tint of each trip colour, for covers and previews (from the mockups). */
export const tripTints: Record<TripColor, string> = {
  orange: '#F6D3BF',
  forest: '#CFE3D7',
  lagoon: '#C8E0EA',
  raspberry: '#F1CFDE',
  lavender: '#DCD6EC',
  mustard: '#F1E2B8',
};

/** Trip icons: stroke paths on a 24×24 grid, shared by the app and the guest web. */
export const tripIconPaths = {
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  mountain: 'M3 20l6-10 4 6 3-4 5 8z',
  plane: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  palm: 'M12 22V12M12 12C10 8 6 7 3 8M12 12c2-4 6-5 9-4M12 12c-1-4 0-7 3-9M12 12c1-4 0-7-3-9M7 22h10',
  tent: 'M3 20L12 4l9 16zM9 20l3-5 3 5',
  city: 'M3 21V9h6v12M9 21V3h8v18M17 21v-8h4v8M3 21h18',
  boat: 'M3 17l2 4h14l2-4zM12 3v14M12 3l7 10h-7',
  camera: 'M4 8h3l2-3h6l2 3h3v12H4zM12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z',
  car: 'M5 16l1.5-5h11l1.5 5M4 16h16v3H4zM7 19v2M17 19v2',
  bike: 'M6 18a3 3 0 1 0 0-6 3 3 0 1 0 0 6zM18 18a3 3 0 1 0 0-6 3 3 0 1 0 0 6zM6 15l4-7h5l3 7M10 8l2 7',
  suitcase: 'M4 7h16v13H4zM9 7V4h6v3M9 11v5M15 11v5',
  food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8',
} as const;

/** Avatar colours (keys of AVATAR_COLORS in @7trip/shared): background and initials. */
export const avatarColors = {
  sage: { bg: '#D9E8DF', ink: '#22553F' },
  sky: { bg: '#C8E0EA', ink: '#1F5F7A' },
  sand: { bg: '#F1E2B8', ink: '#7A5A08' },
  peach: { bg: '#F6D3BF', ink: '#8A3D12' },
  lilac: { bg: '#DCD6EC', ink: '#4A3C75' },
  rose: { bg: '#F1CFDE', ink: '#8E2A57' },
  periwinkle: { bg: '#E4E6F7', ink: '#3E46A0' },
  stone: { bg: '#E4DFD5', ink: '#3A4352' },
} as const;

export type AvatarColorKey = keyof typeof avatarColors;

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
