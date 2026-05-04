/**
 * Color Palette Definition
 * Maps CSS custom properties to JavaScript objects
 */

export const colorPalette = {
  // Primary palette
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    200: 'var(--color-primary-200)',
    300: 'var(--color-primary-300)',
    400: 'var(--color-primary-400)',
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
    800: 'var(--color-primary-800)',
    900: 'var(--color-primary-900)',
    1000: 'var(--color-primary-1000)',
  },

  // Success palette
  green: {
    50: 'var(--color-green-50)',
    100: 'var(--color-green-100)',
    200: 'var(--color-green-200)',
    300: 'var(--color-green-300)',
    400: 'var(--color-green-400)',
    500: 'var(--color-green-500)',
    600: 'var(--color-green-600)',
    700: 'var(--color-green-700)',
    800: 'var(--color-green-800)',
    900: 'var(--color-green-900)',
  },

  // Error palette
  red: {
    50: 'var(--color-red-50)',
    100: 'var(--color-red-100)',
    200: 'var(--color-red-200)',
    300: 'var(--color-red-300)',
    400: 'var(--color-red-400)',
    500: 'var(--color-red-500)',
    600: 'var(--color-red-600)',
    700: 'var(--color-red-700)',
    800: 'var(--color-red-800)',
    900: 'var(--color-red-900)',
  },

  // Warning palette
  yellow: {
    50: 'var(--color-yellow-50)',
    100: 'var(--color-yellow-100)',
    200: 'var(--color-yellow-200)',
    300: 'var(--color-yellow-300)',
    400: 'var(--color-yellow-400)',
    500: 'var(--color-yellow-500)',
    600: 'var(--color-yellow-600)',
    700: 'var(--color-yellow-700)',
    800: 'var(--color-yellow-800)',
    900: 'var(--color-yellow-900)',
  },

  // Information palette
  blue: {
    50: 'var(--color-blue-50)',
    100: 'var(--color-blue-100)',
    200: 'var(--color-blue-200)',
    300: 'var(--color-blue-300)',
    400: 'var(--color-blue-400)',
    500: 'var(--color-blue-500)',
    600: 'var(--color-blue-600)',
    700: 'var(--color-blue-700)',
    800: 'var(--color-blue-800)',
    900: 'var(--color-blue-900)',
  },

  // Neutral palette
  neutral: {
    0: 'var(--color-neutral-00)',
    50: 'var(--color-neutral-50)',
    100: 'var(--color-neutral-100)',
    200: 'var(--color-neutral-200)',
    300: 'var(--color-neutral-300)',
    400: 'var(--color-neutral-400)',
    500: 'var(--color-neutral-500)',
    600: 'var(--color-neutral-600)',
    700: 'var(--color-neutral-700)',
    800: 'var(--color-neutral-800)',
    900: 'var(--color-neutral-900)',
    1000: 'var(--color-neutral-1000)',
  },

  // Base colors
  white: 'var(--color-white)',

  // Overlay colors
  overlay: {
    white: 'var(--color-overlay-white)',
    black: 'var(--color-overlay-black)',
  },
} as const;

/**
 * Text Color Palette
 */
export const textColors = {
  // Brand text
  brand: {
    primary: 'var(--color-text-brand-primary)',
    secondary: 'var(--color-text-brand-secondary)',
    disabled: 'var(--color-text-brand-disabled)',
  },

  // Neutral text
  neutral: {
    primary: 'var(--color-text-neutral-primary)',
    secondary: 'var(--color-text-neutral-secondary)',
    disabled: 'var(--color-text-neutral-disabled)',
    tertiary: 'var(--color-text-neutral-tertiary)',
    inverse: 'var(--color-text-neutral-inverse)',
  },

  // Success text
  success: {
    default: 'var(--color-text-success-default)',
    secondary: 'var(--color-text-success-secondary)',
    disabled: 'var(--color-text-success-disabled)',
  },

  // Information text / Links
  info: {
    link: 'var(--color-text-information-link)',
    linkHover: 'var(--color-text-information-link-hover)',
  },

  // Error text
  error: {
    default: 'var(--color-text-error-default)',
    secondary: 'var(--color-text-error-secondary)',
    disabled: 'var(--color-text-error-disabled)',
  },

  // Warning text
  warning: {
    default: 'var(--color-text-warning-default)',
    secondary: 'var(--color-text-warning-secondary)',
    disabled: 'var(--color-text-warning-disabled)',
  },
} as const;

/**
 * Surface Color Palette (Backgrounds)
 */
export const surfaceColors = {
  bg: 'var(--color-surface-bg)',
  default: 'var(--color-surface-default)',
  subtle: 'var(--color-surface-subtle)',
  secondary: 'var(--color-surface-secondary)',
  elevated: 'var(--color-surface-elevated)',

  brand: {
    default: 'var(--color-surface-brand-default)',
    hover: 'var(--color-surface-brand-hover)',
    secondaryHover: 'var(--color-surface-brand-secondary-hover)',
    disabled: 'var(--color-surface-brand-disabled)',
    focus: 'var(--color-surface-brand-focus)',
  },

  success: {
    default: 'var(--color-surface-success-default)',
    hover: 'var(--color-surface-success-hover)',
    secondaryHover: 'var(--color-surface-success-secondary-hover)',
    disabled: 'var(--color-surface-success-disabled)',
    focus: 'var(--color-surface-success-focus)',
  },

  error: {
    default: 'var(--color-surface-error-default)',
    hover: 'var(--color-surface-error-hover)',
    secondaryHover: 'var(--color-surface-error-secondary-hover)',
    disabled: 'var(--color-surface-error-disabled)',
    focus: 'var(--color-surface-error-focus)',
  },

  warning: {
    default: 'var(--color-surface-warning-default)',
    hover: 'var(--color-surface-warning-hover)',
    secondaryHover: 'var(--color-surface-warning-secondary-hover)',
    disabled: 'var(--color-surface-warning-disabled)',
    focus: 'var(--color-surface-warning-focus)',
  },

  neutral: {
    default: 'var(--color-surface-neutral-default)',
    hover: 'var(--color-surface-neutral-hover)',
    secondaryHover: 'var(--color-surface-neutral-secondary-hover)',
    disabled: 'var(--color-surface-neutral-disabled)',
    focus: 'var(--color-surface-neutral-focus)',
  },
} as const;

/**
 * Border Color Palette
 */
export const borderColors = {
  neutral: {
    default: 'var(--color-border-neutral-default)',
    hover: 'var(--color-border-neutral-hover)',
    disabled: 'var(--color-border-neutral-disabled)',
    focus: 'var(--color-border-neutral-focus)',
  },

  brand: {
    default: 'var(--color-border-brand-default)',
    hover: 'var(--color-border-brand-hover)',
    disabled: 'var(--color-border-brand-disabled)',
    focus: 'var(--color-border-brand-focus)',
  },

  success: {
    default: 'var(--color-border-success-default)',
    hover: 'var(--color-border-success-hover)',
    disabled: 'var(--color-border-success-disabled)',
    focus: 'var(--color-border-success-focus)',
  },

  error: {
    default: 'var(--color-border-error-default)',
    hover: 'var(--color-border-error-hover)',
    disabled: 'var(--color-border-error-disabled)',
    focus: 'var(--color-border-error-focus)',
  },

  warning: {
    default: 'var(--color-border-warning-default)',
    hover: 'var(--color-border-warning-hover)',
    disabled: 'var(--color-border-warning-disabled)',
    focus: 'var(--color-border-warning-focus)',
  },

  info: {
    default: 'var(--color-border-info-default)',
    hover: 'var(--color-border-info-hover)',
    disabled: 'var(--color-border-info-disabled)',
    focus: 'var(--color-border-info-focus)',
  },
} as const;

/**
 * Icon Color Palette
 */
export const iconColors = {
  primary: 'var(--color-icon-primary)',
  secondary: 'var(--color-icon-secondary)',
  tertiary: 'var(--color-icon-tertiary)',
  inverse: 'var(--color-icon-inverse)',
  brand: 'var(--color-icon-brand)',
  success: 'var(--color-icon-success)',
  error: 'var(--color-icon-error)',
  warning: 'var(--color-icon-warning)',
  info: 'var(--color-icon-info)',
  disabled: 'var(--color-icon-disabled)',
} as const;

/**
 * Chart Color Palette
 */
export const chartColors = {
  primary: 'var(--color-chart-primary)',
  secondary: 'var(--color-chart-secondary)',
  neutral: 'var(--color-chart-neutral)',
  positive: 'var(--color-chart-positive)',
  negative: 'var(--color-chart-negative)',
} as const;

/**
 * Complete theme colors object
 * Includes all color palettes with flat keys for quick access
 * e.g., colors.neutral200, colors.primary500, etc.
 */
export const createThemeColors = () => {
  return {
    // Palette colors with flat notation
    primary50: colorPalette.primary[50],
    primary100: colorPalette.primary[100],
    primary200: colorPalette.primary[200],
    primary300: colorPalette.primary[300],
    primary400: colorPalette.primary[400],
    primary500: colorPalette.primary[500],
    primary600: colorPalette.primary[600],
    primary700: colorPalette.primary[700],
    primary800: colorPalette.primary[800],
    primary900: colorPalette.primary[900],
    primary1000: colorPalette.primary[1000],

    green50: colorPalette.green[50],
    green100: colorPalette.green[100],
    green200: colorPalette.green[200],
    green300: colorPalette.green[300],
    green400: colorPalette.green[400],
    green500: colorPalette.green[500],
    green600: colorPalette.green[600],
    green700: colorPalette.green[700],
    green800: colorPalette.green[800],
    green900: colorPalette.green[900],

    red50: colorPalette.red[50],
    red100: colorPalette.red[100],
    red200: colorPalette.red[200],
    red300: colorPalette.red[300],
    red400: colorPalette.red[400],
    red500: colorPalette.red[500],
    red600: colorPalette.red[600],
    red700: colorPalette.red[700],
    red800: colorPalette.red[800],
    red900: colorPalette.red[900],

    yellow50: colorPalette.yellow[50],
    yellow100: colorPalette.yellow[100],
    yellow200: colorPalette.yellow[200],
    yellow300: colorPalette.yellow[300],
    yellow400: colorPalette.yellow[400],
    yellow500: colorPalette.yellow[500],
    yellow600: colorPalette.yellow[600],
    yellow700: colorPalette.yellow[700],
    yellow800: colorPalette.yellow[800],
    yellow900: colorPalette.yellow[900],

    blue50: colorPalette.blue[50],
    blue100: colorPalette.blue[100],
    blue200: colorPalette.blue[200],
    blue300: colorPalette.blue[300],
    blue400: colorPalette.blue[400],
    blue500: colorPalette.blue[500],
    blue600: colorPalette.blue[600],
    blue700: colorPalette.blue[700],
    blue800: colorPalette.blue[800],
    blue900: colorPalette.blue[900],

    neutral0: colorPalette.neutral[0],
    neutral50: colorPalette.neutral[50],
    neutral100: colorPalette.neutral[100],
    neutral200: colorPalette.neutral[200],
    neutral300: colorPalette.neutral[300],
    neutral400: colorPalette.neutral[400],
    neutral500: colorPalette.neutral[500],
    neutral600: colorPalette.neutral[600],
    neutral700: colorPalette.neutral[700],
    neutral800: colorPalette.neutral[800],
    neutral900: colorPalette.neutral[900],
    neutral1000: colorPalette.neutral[1000],

    white: colorPalette.white,

    // Text colors
    textBrandPrimary: textColors.brand.primary,
    textBrandSecondary: textColors.brand.secondary,
    textBrandDisabled: textColors.brand.disabled,

    textNeutralPrimary: textColors.neutral.primary,
    textNeutralSecondary: textColors.neutral.secondary,
    textNeutralDisabled: textColors.neutral.disabled,
    textNeutralTertiary: textColors.neutral.tertiary,
    textNeutralInverse: textColors.neutral.inverse,

    textSuccessDefault: textColors.success.default,
    textSuccessSecondary: textColors.success.secondary,
    textSuccessDisabled: textColors.success.disabled,

    textInfoLink: textColors.info.link,
    textInfoLinkHover: textColors.info.linkHover,

    textErrorDefault: textColors.error.default,
    textErrorSecondary: textColors.error.secondary,
    textErrorDisabled: textColors.error.disabled,

    textWarningDefault: textColors.warning.default,
    textWarningSecondary: textColors.warning.secondary,
    textWarningDisabled: textColors.warning.disabled,

    // Surface colors
    surfaceBg: surfaceColors.bg,
    surfaceDefault: surfaceColors.default,
    surfaceSubtle: surfaceColors.subtle,
    surfaceSecondary: surfaceColors.secondary,
    surfaceElevated: surfaceColors.elevated,

    surfaceBrandDefault: surfaceColors.brand.default,
    surfaceBrandHover: surfaceColors.brand.hover,
    surfaceBrandSecondaryHover: surfaceColors.brand.secondaryHover,
    surfaceBrandDisabled: surfaceColors.brand.disabled,
    surfaceBrandFocus: surfaceColors.brand.focus,

    surfaceSuccessDefault: surfaceColors.success.default,
    surfaceSuccessHover: surfaceColors.success.hover,
    surfaceSuccessSecondaryHover: surfaceColors.success.secondaryHover,
    surfaceSuccessDisabled: surfaceColors.success.disabled,
    surfaceSuccessFocus: surfaceColors.success.focus,

    surfaceErrorDefault: surfaceColors.error.default,
    surfaceErrorHover: surfaceColors.error.hover,
    surfaceErrorSecondaryHover: surfaceColors.error.secondaryHover,
    surfaceErrorDisabled: surfaceColors.error.disabled,
    surfaceErrorFocus: surfaceColors.error.focus,

    surfaceWarningDefault: surfaceColors.warning.default,
    surfaceWarningHover: surfaceColors.warning.hover,
    surfaceWarningSecondaryHover: surfaceColors.warning.secondaryHover,
    surfaceWarningDisabled: surfaceColors.warning.disabled,
    surfaceWarningFocus: surfaceColors.warning.focus,

    surfaceNeutralDefault: surfaceColors.neutral.default,
    surfaceNeutralHover: surfaceColors.neutral.hover,
    surfaceNeutralSecondaryHover: surfaceColors.neutral.secondaryHover,
    surfaceNeutralDisabled: surfaceColors.neutral.disabled,
    surfaceNeutralFocus: surfaceColors.neutral.focus,

    // Border colors
    borderNeutralDefault: borderColors.neutral.default,
    borderNeutralHover: borderColors.neutral.hover,
    borderNeutralDisabled: borderColors.neutral.disabled,
    borderNeutralFocus: borderColors.neutral.focus,

    borderBrandDefault: borderColors.brand.default,
    borderBrandHover: borderColors.brand.hover,
    borderBrandDisabled: borderColors.brand.disabled,
    borderBrandFocus: borderColors.brand.focus,

    borderSuccessDefault: borderColors.success.default,
    borderSuccessHover: borderColors.success.hover,
    borderSuccessDisabled: borderColors.success.disabled,
    borderSuccessFocus: borderColors.success.focus,

    borderErrorDefault: borderColors.error.default,
    borderErrorHover: borderColors.error.hover,
    borderErrorDisabled: borderColors.error.disabled,
    borderErrorFocus: borderColors.error.focus,

    borderWarningDefault: borderColors.warning.default,
    borderWarningHover: borderColors.warning.hover,
    borderWarningDisabled: borderColors.warning.disabled,
    borderWarningFocus: borderColors.warning.focus,

    borderInfoDefault: borderColors.info.default,
    borderInfoHover: borderColors.info.hover,
    borderInfoDisabled: borderColors.info.disabled,
    borderInfoFocus: borderColors.info.focus,

    // Icon colors
    iconPrimary: iconColors.primary,
    iconSecondary: iconColors.secondary,
    iconTertiary: iconColors.tertiary,
    iconInverse: iconColors.inverse,
    iconBrand: iconColors.brand,
    iconSuccess: iconColors.success,
    iconError: iconColors.error,
    iconWarning: iconColors.warning,
    iconInfo: iconColors.info,
    iconDisabled: iconColors.disabled,

    // Chart colors
    chartPrimary: chartColors.primary,
    chartSecondary: chartColors.secondary,
    chartNeutral: chartColors.neutral,
    chartPositive: chartColors.positive,
    chartNegative: chartColors.negative,
  } as const;
};

export type ThemeColors = ReturnType<typeof createThemeColors>;
