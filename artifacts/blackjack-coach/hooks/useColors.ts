import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 */
export function useColors() {
  const scheme = useColorScheme();
  const rawColors = colors as any;
  const palette =
    scheme === 'dark' && 'dark' in rawColors
      ? rawColors.dark
      : rawColors.light;
  return { ...palette, radius: rawColors.radius };
}
