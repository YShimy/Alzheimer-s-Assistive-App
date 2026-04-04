/**
 * Design System Specification: The Serene Interface
 *
 * "The Cognitive Sanctuary"
 * High-End Editorial approach. Colors are rooted in Earth-tonal neutrals and soft oceanic hues.
 */

// ─── Color Palette ──────────────────────────────────────────
export const colors = {
  background: '#f9f9f7',
  
  inverse_on_surface: '#9c9d9b',
  inverse_primary: '#bae3f8',
  inverse_surface: '#0d0f0e',
  on_background: '#2f3332',
  
  on_error: '#fff7f6',
  on_error_container: '#6e0a12',
  
  on_primary: '#f3faff',
  on_primary_container: '#2b5365',
  on_primary_fixed: '#154051',
  on_primary_fixed_variant: '#355d6f',
  
  on_secondary: '#e2fff9',
  on_secondary_container: '#265a53',
  on_secondary_fixed: '#0e4741',
  on_secondary_fixed_variant: '#31645d',
  
  on_surface: '#2f3332',
  on_surface_variant: '#5c605e',
  
  on_tertiary: '#fff7f4',
  on_tertiary_container: '#62401c',
  on_tertiary_fixed: '#4c2d0a',
  on_tertiary_fixed_variant: '#6c4924',
  
  outline: '#777c79',
  outline_variant: '#afb3b0',
  
  primary_container: '#bae3f8',
  primary_dim: '#30586a',
  primary_fixed: '#bae3f8',
  primary_fixed_dim: '#acd5ea',
  
  secondary_container: '#b7ede3',
  secondary_dim: '#275b54',
  secondary_fixed: '#b7ede3',
  secondary_fixed_dim: '#aadfd5',
  
  surface: '#f9f9f7',
  surface_bright: '#f9f9f7',
  surface_container: '#eceeec',
  surface_container_high: '#e6e9e6',
  surface_container_highest: '#e0e3e0',
  surface_container_low: '#f3f4f2',
  surface_container_lowest: '#ffffff',
  surface_dim: '#d7dbd8',
  surface_tint: '#3d6476',
  surface_variant: '#e0e3e0',
  
  tertiary_container: '#fac898',
  tertiary_dim: '#6f4c26',
  tertiary_fixed: '#fac898',
  tertiary_fixed_dim: '#ebbb8c',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Type compatibility mappings for legacy + new UI components
  success: {
    light: '#b7ede3', 
    main: '#346860',  
    dark: '#275b54',  
  },
  warning: {
    light: '#fac898', 
    main: '#7d5731',  
    dark: '#6f4c26',  
  },
  info: {
    light: '#bae3f8', 
    main: '#3d6476',  
    dark: '#30586a',  
  },
  error: {
    light: '#fa746f',
    main: '#a83836',
    dark: '#67040d',
    50: '#fff7f6',
    100: '#fa746f',
    500: '#a83836',
  },
  primary: {
    main: '#3d6476', // new tokens access
    50: '#f3f4f2',
    100: '#e6e9e6',
    200: '#bae3f8',
    300: '#acd5ea',
    400: '#30586a', // dim
    500: '#3d6476', // legacy main primary
    600: '#154051',
    700: '#154051',
    800: '#154051',
    900: '#0d0f0e',
  },
  secondary: {
    main: '#346860',
    50: '#f3f4f2',
    100: '#e6e9e6',
    200: '#b7ede3',
    300: '#aadfd5',
    400: '#275b54', // dim
    500: '#346860', // main secondary
    600: '#0e4741',
    700: '#0e4741',
    800: '#0e4741',
    900: '#0d0f0e',
  },
  tertiary: {
    main: '#7d5731',
    50: '#fff7f4',
    100: '#fac898',
    500: '#7d5731',
  },
  neutral: {
    50: '#ffffff',
    100: '#f9f9f7',
    200: '#f3f4f2',
    300: '#eceeec',
    400: '#afb3b0', // outline variant
    500: '#777c79', // outline
    600: '#5c605e', // on_surface_variant
    700: '#2f3332', // on_surface
    800: '#2f3332',
    900: '#0d0f0e',
  },
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  family: {
    display: 'Manrope_700Bold',
    headline: 'Manrope_600SemiBold',
    title: 'PublicSans_600SemiBold',
    body: 'PublicSans_400Regular',
    label: 'PublicSans_500Medium',
    fallback: 'System',

    // Legacy standard mappings
    regular: 'PublicSans_400Regular',
    medium: 'PublicSans_500Medium',
    semiBold: 'PublicSans_600SemiBold',
    bold: 'Manrope_700Bold',
  },

  // Type scale
  size: {
    xs: 12,    // label-md 0.75rem
    sm: 14,
    base: 16,  // body-lg 1rem
    lg: 18,    // title-md 1.125rem
    xl: 20,
    '2xl': 24, // headline-sm 1.5rem
    '3xl': 30,
    '4xl': 44, // display-md 2.75rem
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
  sm: 4,
  md: 12, // 0.75rem for buttons and internal components
  lg: 16,
  xl: 24, // 1.5rem for main dashboard cards
  full: 9999, // Should be used minimally outside of FABs/avatars
} as const;

// ─── Shadows ───────────────────────────────────────────────
export const shadows = {
  // Ambient Soft Diffusion shadow (Y: 8, Blur: 24, Color: on-surface @ 6%)
  ambient: {
    shadowColor: colors.on_surface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  sm: {
    shadowColor: colors.on_surface,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.on_surface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.on_surface,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

// ─── Layout ────────────────────────────────────────────────
export const layout = {
  screenPadding: spacing['2xl'],
  cardPadding: spacing.xl,
  minTapTarget: 48,   // Accessibility minimum
  inputHeight: 52,
  buttonHeight: 48,
  headerHeight: 56,
} as const;

// ─── Role-based theme variants ──────────────────────────────
export const roleTheme = {
  patient: {
    accent: colors.primary.main,
    accentLight: colors.primary_container,
    background: colors.background,
    headerTint: colors.primary_dim,
  },
  caregiver: {
    accent: colors.secondary.main,
    accentLight: colors.secondary_container,
    background: colors.surface_container_low,
    headerTint: colors.secondary_dim,
  },
} as const;
