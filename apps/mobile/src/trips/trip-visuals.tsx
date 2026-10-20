import type { TripColorKey, TripIconKey } from '@7trip/shared';
import { tripColors } from '@7trip/ui-tokens';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

/** Light tint of each trip colour, for covers and previews (from the mockups). */
export const tripTints: Record<TripColorKey, string> = {
  orange: '#F6D3BF',
  forest: '#CFE3D7',
  lagoon: '#C8E0EA',
  raspberry: '#F1CFDE',
  lavender: '#DCD6EC',
  mustard: '#F1E2B8',
};

export const tripColorNames: Record<TripColorKey, string> = {
  orange: 'Orange',
  forest: 'Vert sapin',
  lagoon: 'Bleu lagon',
  raspberry: 'Framboise',
  lavender: 'Lavande',
  mustard: 'Moutarde',
};

const iconPaths: Record<TripIconKey, string> = {
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
};

export const tripIconNames: Record<TripIconKey, string> = {
  sun: 'Soleil',
  mountain: 'Montagne',
  plane: 'Avion',
  palm: 'Palmier',
  tent: 'Tente',
  city: 'Ville',
  boat: 'Bateau',
  camera: 'Appareil photo',
  car: 'Voiture',
  bike: 'Vélo',
  suitcase: 'Valise',
  food: 'Restaurant',
};

export function TripIcon({ icon, size = 24, color = '#FFFFFF' }: { icon: TripIconKey; size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={iconPaths[icon]} />
    </Svg>
  );
}

/** Square tile in the trip colour with its icon. */
export function TripIconTile({
  color,
  icon,
  size = 56,
  bordered = false,
}: {
  color: TripColorKey;
  icon: TripIconKey;
  size?: number;
  bordered?: boolean;
}) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.29, backgroundColor: tripColors[color] },
        bordered && styles.tileBorder,
      ]}
    >
      <TripIcon icon={icon} size={size * 0.46} />
    </View>
  );
}

/** Default cover (no photo yet): the trip tint with contour lines. */
export function TripCover({ color, style, children }: { color: TripColorKey; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: tripTints[color], overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 350 200" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <G fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.5}>
          <Ellipse cx="90" cy="180" rx="140" ry="70" />
          <Ellipse cx="90" cy="180" rx="95" ry="44" />
          <Ellipse cx="90" cy="180" rx="50" ry="20" />
          <Ellipse cx="290" cy="30" rx="110" ry="54" />
          <Ellipse cx="290" cy="30" rx="66" ry="28" />
        </G>
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
  tileBorder: { borderWidth: 3, borderColor: '#FFFFFF' },
});
