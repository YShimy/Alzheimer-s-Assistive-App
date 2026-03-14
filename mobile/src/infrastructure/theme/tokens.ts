/**
 * Professional Design System — Cognitive Support App
 *
 * Calm, accessible, thesis-quality design tokens.
 * Light neutral base, calming accent, large tap targets,
 * accessible contrast ratios.
 */

// ─── Color Palette ──────────────────────────────────────────
export const colors = {
  // Primary — calming blue
  primary: {
    50: '#EBF5FF',
    100: '#D6EBFF',
    200: '#ADD6FF',
    300: '#70B8FF',
    400: '#3D9EFF',
    500: '#2B7DE9',    // Main accent
    600: '#1E63C4',
    700: '#164B9E',
    800: '#0F3578',
    900: '#0A2352',
  },

  // Secondary — warm sage green (caregiver accent)
  secondary: {
    50: '#F0F7F0',
    100: '#DCF0DC',
    200: '#B8E0B8',
    300: '#8ACA8A',
    400: '#5BB05B',
    500: '#3D8F3D',
    600: '#2E7A2E',
    700: '#236323',
    800: '#1A4D1A',
    900: '#113811',
  },

  // Neutrals
  neutral: {
    0: '#FFFFFF',
    50: '#F8F9FC',
    100: '#F1F3F8',
    200: '#E4E7EF',
    300: '#CDD2DE',
    400: '#A0A8B9',
    500: '#737D91',
    600: '#515B6F',
    700: '#3B4455',
    800: '#262D3B',
    900: '#141821',
  },

  // Semantic
  success: {
    light: '#E8F5E9',
    main: '#2E7D32',
    dark: '#1B5E20',
  },
  warning: {
    light: '#FFF3E0',
    main: '#EF6C00',
    dark: '#E65100',
  },
  error: {
    light: '#FFEBEE',
    main: '#D32F2F',
    dark: '#B71C1C',
  },
  info: {
    light: '#E3F2FD',
    main: '#1976D2',
    dark: '#0D47A1',
  },

  // Surfaces
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  overlay: 'rgba(20, 24, 33, 0.5)',
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  // Font family — using system fonts for reliability,
  // Inter will be loaded via expo-font in root layout
  family: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    fallback: 'System',
  },

  // Type scale — larger sizes for accessibility
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// ─── Border Radius ──────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows ───────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// ─── Layout ────────────────────────────────────────────────
export const layout = {
  screenPadding: spacing['2xl'],
  cardPadding: spacing.xl,
  minTapTarget: 48,   // Accessibility minimum
  inputHeight: 52,
  buttonHeight: 52,
  headerHeight: 56,
} as const;

// ─── Role-based theme variants ──────────────────────────────
export const roleTheme = {
  patient: {
    accent: colors.primary[500],
    accentLight: colors.primary[50],
    background: colors.background,
    headerTint: colors.primary[600],
  },
  caregiver: {
    accent: colors.secondary[500],
    accentLight: colors.secondary[50],
    background: '#F5F8F5',
    headerTint: colors.secondary[600],
  },
} as const;
