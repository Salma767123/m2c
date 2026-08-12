/**
 * M2C MarkDowns Design System — mobile tokens.
 * ─────────────────────────────────────────────────────────────────────────────
 * These values are a 1:1 port of the web design system so both clients render
 * the same brand. Sources of truth, in order:
 *   /DESIGN.md                         — the spec
 *   /frontend/src/app/globals.css      — the `@theme inline` block the web consumes
 *
 * React Native has no CSS custom properties, so the web's `--color-brand-500`
 * becomes `Brand[500]` here and the Tailwind utility `bg-brand-500` becomes
 * `tailwind.config.js` → `theme.extend.colors.brand[500]`. Both read from the
 * same numbers; if a token changes on the web, change it in BOTH this file and
 * globals.css.
 *
 * Usage:
 *   import { Palette } from '@/constants/theme'
 *   <View style={{ backgroundColor: Palette.primary }} />
 *   <Icon color={Palette.primary} />
 * or, for anything expressible as a class:
 *   <View className="bg-brand-500" />
 */

import { Platform } from 'react-native';

/* ── Brand red ────────────────────────────────────────────────────────────────
   Primary actions, selected states, focus rings. Deliberately distinct from
   `Error` below so an "active selection" never reads as a validation failure. */
export const Brand = {
  50: '#E01A1B',
  100: '#E01A1B',
  200: '#E01A1B',
  400: '#E01A1B',
  500: '#E01A1B',
  600: '#E01A1B',
  700: '#E01A1B',
  800: '#E01A1B',
} as const;

/* ── Success green ── completion states, valid badges, delivered orders. */
export const Success = {
  50: '#ecfdf3',
  500: '#16a34a',
  700: '#15803d',
} as const;

/* ── Tertiary blue ── info actions, link-style buttons. Distinct from primary
   so "info" never collides with a primary CTA. */
export const Tertiary = {
  50: '#f5f7ff',
  500: '#0074c8',
} as const;

/* ── Error red ── validation failures, destructive confirmations, cancelled
   orders. Slightly darker / cooler than brand red. */
export const Error = {
  50: '#E01A1B',
  500: '#E01A1B',
} as const;

/* ── Warning amber ── pending / awaiting-action states. Not in DESIGN.md's four
   families, but every order-status surface needs a "pending" tone and both
   clients were already hardcoding Tailwind amber for it. Named here so the two
   stay in step. */
export const Warning = {
  50: '#fffbeb',
  500: '#d97706',
  700: '#b45309',
} as const;

/* ── Neutral ink ── DESIGN.md maps these to Tailwind gray-900/700/500. */
export const Ink = {
  strong: '#111827', // headings
  base: '#374151',   // body copy
  muted: '#6b7280',  // secondary text
  subtle: '#9ca3af', // placeholders, disabled labels
} as const;

/* ── Surfaces ── canvas sits under cards; card is plain white. */
export const Surface = {
  canvas: '#f7f7f5',
  card: '#ffffff',
  outline: '#e5e7eb',        // standard 1px border
  outlineVariant: '#cbd5e1', // hover / emphasis border
  inverse: '#111827',        // dark panels (splash, headers)
} as const;

/**
 * Semantic aliases — prefer these at call sites over raw ramp steps. Naming
 * follows DESIGN.md's `primary` / `on-primary` / `primary-container` triples.
 */
export const Palette = {
  primary: Brand[500],
  primaryPressed: Brand[600],
  onPrimary: '#ffffff',
  primaryContainer: Brand[50],
  onPrimaryContainer: Brand[800],
  /**
   * Brand accent for use ON a dark surface. brand-500 is tuned for white
   * backgrounds and falls to roughly 3:1 against ink — brand-400 is the same hue
   * a step lighter and clears contrast on the inverse header / splash / footer.
   */
  primaryOnDark: Brand[400],
  /** Translucent brand outline (the web's `ring-[#E01A1B]/40`) — for tiles and
   *  chips that should read as brand-adjacent without a solid red border. */
  brandBorder: 'rgba(224,26,27,0.4)',

  secondary: Success[500],
  onSecondary: '#ffffff',
  secondaryContainer: Success[50],

  tertiary: Tertiary[500],
  onTertiary: '#ffffff',
  tertiaryContainer: Tertiary[50],

  error: Error[500],
  onError: '#ffffff',
  errorContainer: Error[50],

  warning: Warning[500],
  warningContainer: Warning[50],

  ink: Ink.strong,
  text: Ink.base,
  textMuted: Ink.muted,
  textSubtle: Ink.subtle,

  background: Surface.canvas,
  surface: Surface.card,
  surfaceInverse: Surface.inverse,
  outline: Surface.outline,
  outlineVariant: Surface.outlineVariant,
  /** Hairline divider inside a list — lighter than `outline`. */
  outlineSubtle: '#f3f4f6',

  /* Text and glass sitting on `surfaceInverse`. The `text*` tokens above are
     tuned for light surfaces and read as muddy on ink. */
  onInverse: '#ffffff',
  onInverseMuted: Ink.subtle,
  onInverseGlass: 'rgba(255,255,255,0.08)',
  onInverseGlassBorder: 'rgba(255,255,255,0.14)',

  /* ── Brand-filled chrome ───────────────────────────────────────────────
     The app header is a solid brand-red bar (the web equivalent is the red
     `.animate-brand-bar` + its dark strip; on a phone there is only room for
     one, so the bar itself carries the brand).

     Everything painted on it needs its own ramp — the neutral `onInverse*`
     greys go muddy over red, and anything drawn FROM the brand ramp
     (`primary`, `primaryOnDark`) disappears into the background. Rule of
     thumb: on brand chrome, accents are white or near-white, never red. */
  headerSurface: Brand[500],
  /** Bottom edge of the header — a darker step, so the bar reads as an object. */
  headerEdge: Brand[700],
  onBrand: '#ffffff',
  /** Secondary text on brand chrome. brand-100 rather than a grey: it stays in
   *  the red family so it reads as recessive instead of dirty. */
  onBrandMuted: Brand[100],
  /** Inset fields on brand chrome need more lift than on ink — red is a lighter
   *  base than #111827, so a 0.08 white wash barely separates. */
  onBrandGlass: 'rgba(255,255,255,0.16)',
  onBrandGlassBorder: 'rgba(255,255,255,0.30)',

  /** Disabled fills — used by every submitting/blocked button. */
  disabled: '#d1d5db',
  onDisabled: '#6b7280',
} as const;

/**
 * Order / ticket status → colour. Both clients render the same statuses; keeping
 * the mapping in one place stops "DELIVERED" from being green here and blue there.
 */
export const StatusColor: Record<string, { fg: string; bg: string }> = {
  PENDING: { fg: Warning[700], bg: Warning[50] },
  OPEN: { fg: Warning[700], bg: Warning[50] },
  IN_PROGRESS: { fg: Tertiary[500], bg: Tertiary[50] },
  CONFIRMED: { fg: Tertiary[500], bg: Tertiary[50] },
  PROCESSING: { fg: Tertiary[500], bg: Tertiary[50] },
  SHIPPED: { fg: Brand[600], bg: Brand[50] },
  OUT_FOR_DELIVERY: { fg: Brand[600], bg: Brand[50] },
  DELIVERED: { fg: Success[700], bg: Success[50] },
  RESOLVED: { fg: Success[700], bg: Success[50] },
  CLOSED: { fg: Ink.muted, bg: '#f3f4f6' },
  CANCELLED: { fg: Error[500], bg: Error[50] },
  REJECTED: { fg: Error[500], bg: Error[50] },
};

export function statusColor(status?: string | null) {
  if (!status) return { fg: Ink.muted, bg: '#f3f4f6' };
  return StatusColor[status.toUpperCase()] ?? { fg: Ink.muted, bg: '#f3f4f6' };
}

/* ── Radii ── mirrors DESIGN.md `rounded`. RN takes numbers, not rem. */
export const Radius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/* ── Spacing ── DESIGN.md stack scale. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 48,
  gutter: 24,
} as const;

/**
 * Elevation. DESIGN.md keeps shadows low-contrast on purpose — the system leans
 * on borders and tonal layers instead. `elevation` is the Android counterpart.
 */
export const Shadow = {
  cardRest: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  dropdown: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  modal: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 16,
  },
} as const;

/**
 * Type scale — the 9 levels from DESIGN.md. `letterSpacing` is in points on RN
 * (the web spec is in em), so each value is the em figure × its font size.
 */
export const Typography = {
  displayLg: { fontSize: 48, lineHeight: 56, letterSpacing: -0.96, fontWeight: '700' },
  headlineLg: { fontSize: 32, lineHeight: 40, letterSpacing: -0.32, fontWeight: '600' },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  headlineSm: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  bodyLg: { fontSize: 18, lineHeight: 28, fontWeight: '400' },
  bodyMd: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  labelLg: { fontSize: 14, lineHeight: 20, letterSpacing: 0.28, fontWeight: '600' },
  labelMd: { fontSize: 12, lineHeight: 16, letterSpacing: 0.48, fontWeight: '600' },
  labelSm: { fontSize: 11, lineHeight: 14, letterSpacing: 0.55, fontWeight: '500' },
} as const;

/**
 * Kept for `useThemeColor` / React Navigation's ThemeProvider, which both expect
 * this shape. Values now point at the brand instead of Expo's default teal.
 */
export const Colors = {
  light: {
    text: Ink.strong,
    background: Surface.card,
    tint: Brand[500],
    icon: Ink.muted,
    tabIconDefault: Ink.subtle,
    tabIconSelected: Brand[500],
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: Brand[400],
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: Brand[400],
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
