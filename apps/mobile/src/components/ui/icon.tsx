import { colors } from '@7trip/ui-tokens';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Stroke icons drawn on a 24×24 grid, taken from the V1 mockups.
const icons = {
  plus: <Path d="M12 5v14M5 12h14" />,
  back: <Path d="M19 12H5M11 6l-6 6 6 6" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  check: <Path d="M5 12l5 5 9-10" />,
  bell: <Path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />,
  link: <Path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />,
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  suitcase: (
    <>
      <Rect x="3" y="7" width="18" height="13" rx="2" />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  map: (
    <>
      <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <Path d="M9 4v14M15 6v14" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  logout: <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />,
  pencil: <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
} as const;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </Svg>
  );
}
