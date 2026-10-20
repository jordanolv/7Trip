import { colors } from '@7trip/ui-tokens';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Discreet contour lines behind screen headers — the "cartography" touch of the mockups. */
export function TopoLines({ height = 300 }: { height?: number }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMin slice"
      fill="none"
      stroke={colors.topoLine}
      strokeWidth={1.5}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Path d="M-20 60 C60 30 150 90 230 60 S360 20 420 50" />
      <Path d="M-20 100 C70 70 160 130 240 100 S370 60 420 90" />
      <Path d="M-20 140 C80 112 170 170 250 140 S380 100 420 130" />
    </Svg>
  );
}
