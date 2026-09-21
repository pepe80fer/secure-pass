import { Platform } from 'react-native';

/**
 * Design tokens — tema único oscuro (ver plan.md, sección 5).
 * secure-pass no ofrece modo claro: la estética oscura es parte de la
 * identidad visual (tipo 1Password/Bitwarden), no una preferencia de SO.
 */
export const colors = {
  background: '#0B0E14',
  surface: '#151A23',
  surfaceSelected: '#1D2430',
  border: '#242B38',
  text: '#F2F4F8',
  textSecondary: '#9AA3B2',
  accent: '#5B8DEF',
  success: '#3ECF8E',
  danger: '#E5484D',
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
})!;

export const spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const radius = {
  small: 8,
  medium: 12,
  large: 20,
} as const;
