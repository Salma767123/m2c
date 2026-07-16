/**
 * M2C QC Checker — Mobile Design System
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for colors, typography, spacing, radius
 * and elevation in `checker_app`. Mirrors the WEB checker portal
 * palette (frontend/src/app/globals.css → @theme + checker chrome),
 * whose accent is BRAND RED (#e01a1b) on white / slate surfaces.
 *
 * Use these tokens instead of hard-coding hexes. NativeWind class
 * equivalents (bg-brand-500, text-slate-600, …) are registered in
 * tailwind.config.js and stay in sync with this file.
 * ───────────────────────────────────────────────────────────── */

import { Platform, TextStyle, ViewStyle } from 'react-native';

/* ── Color families ─────────────────────────────────────────── */

// Brand red — primary actions, active states, focus, AppBar background.
export const brand = {
  50: '#fff1f1',
  100: '#ffdede',
  200: '#ffc1c1',
  400: '#f24344',
  500: '#e01a1b',
  600: '#c41617',
  700: '#a31314',
} as const;

// Success green — completion / approved.
export const success = {
  50: '#ecfdf3',
  100: '#dcfce7',
  500: '#16a34a',
  600: '#15803d',
  700: '#15803d',
} as const;

// Info blue (web tertiary) — informational, links.
export const info = {
  50: '#eff6ff',
  100: '#dbeafe',
  500: '#0074c8',
  600: '#0369a1',
} as const;

// Amber — pending / warning.
export const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  500: '#d97706',
  600: '#b45309',
  700: '#a16207',
} as const;

// Error red — validation failures, destructive.
export const danger = {
  50: '#fee2e2',
  100: '#fecaca',
  500: '#dc2626',
  600: '#b91c1c',
  700: '#991b1b',
} as const;

// Slate — text, borders, neutral surfaces (matches web checker chrome).
export const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
} as const;

/* ── Semantic aliases ───────────────────────────────────────── */

export const colors = {
  // Primary (brand red)
  primary: brand[500],
  primaryDark: brand[600],
  primaryLight: brand[50],
  primaryBorder: brand[100],
  onPrimary: '#ffffff',

  // Surfaces
  canvas: '#f7f7f5',        // app background under cards (web --surface-canvas)
  surface: '#ffffff',       // card / sheet background
  surfaceMuted: slate[50],  // subtle inset panels

  // Borders / dividers — slate-300 so card outlines stay clearly visible
  // against the near-white canvas (slate-200 was invisible on mobile).
  border: slate[300],       // standard 1px card / input border
  borderStrong: slate[400],
  divider: slate[200],      // subtle inner dividers (section header rules)

  // Text
  text: slate[900],         // headings / primary
  textSecondary: slate[600],
  textMuted: slate[500],
  textFaint: slate[400],
  onDark: '#ffffff',

  // Status foreground/backgrounds
  successFg: success[500],
  successBg: success[100],
  infoFg: info[500],
  infoBg: info[100],
  warnFg: amber[600],
  warnBg: amber[100],
  dangerFg: danger[500],
  dangerBg: danger[50],

  white: '#ffffff',
  black: '#0f172a',
} as const;

/* ── Typography ─────────────────────────────────────────────────
 * Web uses Outfit. We load Outfit_{400,500,600,700} in _layout via
 * @expo-google-fonts/outfit and reference the weight-specific family
 * names here. `fonts.regular` etc. resolve to system font until the
 * font finishes loading (graceful fallback).
 * ───────────────────────────────────────────────────────────── */

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

type Variant = TextStyle;

export const type: Record<
  | 'displayLg'
  | 'headlineLg'
  | 'headlineMd'
  | 'headlineSm'
  | 'titleLg'
  | 'titleMd'
  | 'bodyLg'
  | 'bodyMd'
  | 'bodySm'
  | 'labelLg'
  | 'labelMd'
  | 'labelSm',
  Variant
> = {
  displayLg: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, color: colors.text },
  headlineLg: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: colors.text },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.text },
  headlineSm: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.text },
  titleLg: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  titleMd: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  bodyMd: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  labelLg: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16, letterSpacing: 0.2, color: colors.text },
  labelMd: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, letterSpacing: 0.4, color: colors.textSecondary },
  labelSm: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.5, color: colors.textMuted },
};

/* ── Spacing (4pt scale) ────────────────────────────────────── */

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/* ── Radius ─────────────────────────────────────────────────── */

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
} as const;

/* Minimum comfortable touch target. */
export const HIT = 44;

/* ── Elevation (cross-platform shadow presets) ──────────────── */

const shadow = (
  elevation: number,
  opacity: number,
  radiusPx: number,
  offsetY: number
): ViewStyle =>
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  })!;

export const elevation = {
  none: {} as ViewStyle,
  card: shadow(2, 0.06, 8, 2),
  raised: shadow(4, 0.1, 14, 5),
  dropdown: shadow(8, 0.14, 22, 8),
  modal: shadow(16, 0.2, 34, 14),
} as const;

/* ── Status → color mapping (QC domain) ─────────────────────────
 * Shared badge palette used across dashboard / lists / detail.
 * Keys are matched case-insensitively by statusStyle().
 * ───────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<string, { fg: string; bg: string; border: string }> = {
  approved: { fg: success[600], bg: success[50], border: success[100] },
  completed: { fg: success[600], bg: success[50], border: success[100] },
  passed: { fg: success[600], bg: success[50], border: success[100] },
  active: { fg: success[600], bg: success[50], border: success[100] },
  pending: { fg: amber[600], bg: amber[50], border: amber[100] },
  'in progress': { fg: amber[600], bg: amber[50], border: amber[100] },
  scheduled: { fg: info[500], bg: info[50], border: info[100] },
  assigned: { fg: info[500], bg: info[50], border: info[100] },
  reinspection: { fg: amber[600], bg: amber[50], border: amber[100] },
  rejected: { fg: danger[500], bg: danger[50], border: danger[100] },
  failed: { fg: danger[500], bg: danger[50], border: danger[100] },
};

const STATUS_DEFAULT = { fg: slate[600], bg: slate[100], border: slate[200] };

export function statusStyle(status?: string | null) {
  if (!status) return STATUS_DEFAULT;
  const key = status.toLowerCase().trim();
  return (
    STATUS_MAP[key] ||
    Object.entries(STATUS_MAP).find(([k]) => key.includes(k))?.[1] ||
    STATUS_DEFAULT
  );
}
