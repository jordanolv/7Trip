import type { TripColorKey, TripIconKey } from '@7trip/shared';
import { tripColors, tripIconPaths, tripTints } from '@7trip/ui-tokens';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

export const tripColorNames: Record<TripColorKey, string> = {
  orange: 'Orange',
  forest: 'Vert sapin',
  lagoon: 'Bleu lagon',
  raspberry: 'Framboise',
  lavender: 'Lavande',
  mustard: 'Moutarde',
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
      <Path d={tripIconPaths[icon]} />
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
