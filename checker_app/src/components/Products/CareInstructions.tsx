/**
 * Care instruction symbols — read-only display chips.
 *
 * Mobile port of the web care-symbol catalogue
 * (frontend/src/components/VendorDashboard/Products/CareInstructionModal.tsx).
 * The web renders each symbol as an inline <svg viewBox="0 0 32 32">; here we
 * render the same geometry with react-native-svg and expose CareChip for the
 * detail screen. Paths are a function of the icon color because react-native-svg
 * has no "currentColor" keyword — filled dots / text markers need the actual hex.
 */
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export interface CareInstruction {
  id: string;
  label: string;
  category: string;
  paths: (color: string) => React.ReactNode[];
}

// Icon colour per category (matches web CATEGORY_COLORS, minus the text- prefix).
export const CATEGORY_COLORS: Record<string, string> = {
  Washing: '#3b82f6',
  Bleaching: '#f59e0b',
  Drying: '#10b981',
  Ironing: '#f97316',
  'Dry Cleaning': '#8b5cf6',
  Special: '#f43f5e',
};

// Card style per category (matches web CATEGORY_BORDER).
export const CATEGORY_CARD: Record<string, { border: string; bg: string; text: string }> = {
  Washing: { border: '#60a5fa', bg: '#eff6ff', text: '#1e40af' },
  Bleaching: { border: '#fbbf24', bg: '#fffbeb', text: '#92400e' },
  Drying: { border: '#34d399', bg: '#ecfdf5', text: '#065f46' },
  Ironing: { border: '#fb923c', bg: '#fff7ed', text: '#9a3412' },
  'Dry Cleaning': { border: '#a78bfa', bg: '#f5f3ff', text: '#5b21b6' },
  Special: { border: '#fb7185', bg: '#fff1f2', text: '#9f1239' },
};

const DEFAULT_CARD = { border: '#e2e8f0', bg: '#f8fafc', text: '#334155' };

/** Renders one 32×32 care symbol in the given colour. */
export function CareIcon({ paths, color, size = 28 }: { paths: (color: string) => React.ReactNode[]; color: string; size?: number }) {
  return (
    <Svg viewBox="0 0 32 32" width={size} height={size}>
      <G stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {paths(color)}
      </G>
    </Svg>
  );
}

// ─── Shared shape primitives ──────────────────────────────────────────────────

const washTub = <Path key="tub" d="M4 10H28V21Q28 25 24 25H8Q4 25 4 21Z" />;
const washWave = <Path key="wave" d="M9 18Q11.5 15.5 14 18Q16.5 20.5 19 18Q21.5 15.5 23 18" />;
const notX = <Path key="x" d="M8 8L24 24M24 8L8 24" strokeWidth={2.2} />;
const drySquare = <Rect key="sq" x={3} y={3} width={26} height={26} rx={2} />;
const bigCircle = <Circle key="c" cx={16} cy={16} r={12} />;
const ironBodyPaths = [
  <Path key="body" d="M4 22H23Q27 22 28 20L28 17Q28 15 25 15H10Q7 15 4 18Z" />,
  <Path key="handle" d="M11 15V10Q11 9 12 9H15Q16 9 16 10V15" />,
];
const dot = (cx: number, color: string) => (
  <Circle key={`d${cx}`} cx={cx} cy={19} r={1.5} fill={color} stroke="none" />
);
const tempText = (label: string, color: string) => (
  <SvgText
    key="t"
    x={16}
    y={21}
    textAnchor="middle"
    fontSize={8}
    fontFamily="sans-serif"
    fill={color}
    stroke="none"
    strokeWidth={0}
  >
    {label}
  </SvgText>
);

// ─── Care instruction catalogue ───────────────────────────────────────────────

export const CARE_INSTRUCTIONS: CareInstruction[] = [
  // ── Washing ──────────────────────────────────────────────────────────────────
  { id: 'machine-wash', label: 'Machine Wash', category: 'Washing', paths: () => [washTub, washWave] },
  {
    id: 'hand-wash',
    label: 'Hand Wash',
    category: 'Washing',
    paths: () => [
      washTub,
      <Path
        key="fingers"
        d="M16 24V17M13 23V18M19 23V18M11 22V19M21 22V19"
        strokeWidth={1.5}
      />,
    ],
  },
  {
    id: 'warm-wash',
    label: 'Warm Wash (40°C)',
    category: 'Washing',
    paths: (color) => [washTub, tempText('40°', color)],
  },
  {
    id: 'cold-wash',
    label: 'Cold Wash (30°C)',
    category: 'Washing',
    paths: (color) => [washTub, tempText('30°', color)],
  },
  { id: 'do-not-wash', label: 'Do Not Wash', category: 'Washing', paths: () => [washTub, notX] },

  // ── Bleaching ─────────────────────────────────────────────────────────────────
  {
    id: 'bleach',
    label: 'Bleach Allowed',
    category: 'Bleaching',
    paths: () => [<Path key="tri" d="M16 4L29 28H3Z" />],
  },
  {
    id: 'non-chlorine-bleach',
    label: 'Non-Chlorine Bleach',
    category: 'Bleaching',
    paths: () => [
      <Path key="tri" d="M16 4L29 28H3Z" />,
      <Line key="ln" x1={16} y1={14} x2={16} y2={24} strokeWidth={2} />,
    ],
  },
  {
    id: 'no-bleach',
    label: 'Do Not Bleach',
    category: 'Bleaching',
    paths: () => [<Path key="tri" d="M16 4L29 28H3Z" />, notX],
  },

  // ── Drying ────────────────────────────────────────────────────────────────────
  {
    id: 'tumble-dry',
    label: 'Tumble Dry',
    category: 'Drying',
    paths: () => [drySquare, <Circle key="ci" cx={16} cy={16} r={8} />],
  },
  {
    id: 'no-tumble-dry',
    label: 'Do Not Tumble Dry',
    category: 'Drying',
    paths: () => [drySquare, <Circle key="ci" cx={16} cy={16} r={8} />, notX],
  },
  {
    id: 'line-dry',
    label: 'Line Dry',
    category: 'Drying',
    paths: () => [drySquare, <Line key="vl" x1={16} y1={5} x2={16} y2={27} />],
  },
  {
    id: 'flat-dry',
    label: 'Flat Dry',
    category: 'Drying',
    paths: () => [drySquare, <Line key="hl" x1={5} y1={16} x2={27} y2={16} />],
  },
  {
    id: 'drip-dry',
    label: 'Drip Dry',
    category: 'Drying',
    paths: () => [
      drySquare,
      <Path key="drips" d="M11 10V20M16 10V20M21 10V20" />,
    ],
  },
  {
    id: 'shade-dry',
    label: 'Shade Dry',
    category: 'Drying',
    paths: () => [
      drySquare,
      <Path
        key="hatch"
        d="M3 13L13 3M3 22L22 3M3 29L29 3M12 29L29 12M21 29L29 21"
        strokeWidth={1}
      />,
    ],
  },

  // ── Ironing ───────────────────────────────────────────────────────────────────
  {
    id: 'iron-low',
    label: 'Iron Low Heat',
    category: 'Ironing',
    paths: (color) => [...ironBodyPaths, dot(16, color)],
  },
  {
    id: 'iron-medium',
    label: 'Iron Medium Heat',
    category: 'Ironing',
    paths: (color) => [...ironBodyPaths, dot(13, color), dot(19, color)],
  },
  {
    id: 'iron-high',
    label: 'Iron High Heat',
    category: 'Ironing',
    paths: (color) => [...ironBodyPaths, dot(10, color), dot(16, color), dot(22, color)],
  },
  {
    id: 'no-iron',
    label: 'Do Not Iron',
    category: 'Ironing',
    paths: () => [...ironBodyPaths, notX],
  },
  {
    id: 'iron-no-steam',
    label: 'Iron – No Steam',
    category: 'Ironing',
    paths: () => [
      ...ironBodyPaths,
      <Path key="nosteam" d="M12 8L15 5M15 8L12 5" strokeWidth={1.6} />,
    ],
  },

  // ── Dry Cleaning ──────────────────────────────────────────────────────────────
  { id: 'dry-clean', label: 'Dry Clean', category: 'Dry Cleaning', paths: () => [bigCircle] },
  {
    id: 'no-dry-clean',
    label: 'Do Not Dry Clean',
    category: 'Dry Cleaning',
    paths: () => [bigCircle, notX],
  },
  {
    id: 'professional-wet-clean',
    label: 'Professional Wet Clean',
    category: 'Dry Cleaning',
    paths: () => [
      bigCircle,
      <Path key="w" d="M10 12L12.5 22L16 15L19.5 22L22 12" strokeWidth={1.8} />,
    ],
  },

  // ── Special ───────────────────────────────────────────────────────────────────
  {
    id: 'do-not-wring',
    label: 'Do Not Wring',
    category: 'Special',
    paths: () => [
      <Path key="tw1" d="M4 14Q8 10 12 14Q16 18 20 14Q24 10 28 14" />,
      <Path key="tw2" d="M4 20Q8 16 12 20Q16 24 20 20Q24 16 28 20" />,
      notX,
    ],
  },
  {
    id: 'wash-separately',
    label: 'Wash Separately',
    category: 'Special',
    paths: () => [
      washTub,
      <Path key="sep" d="M8 14L13 17L8 20M24 14L19 17L24 20" strokeWidth={1.5} />,
    ],
  },
];

/**
 * Display chip for a single instruction label. Renders the catalogue symbol
 * (with its category colours) when the label matches, else a plain chip.
 */
export function CareChip({ label }: { label: string }) {
  const item = CARE_INSTRUCTIONS.find((c) => c.label === label);
  if (!item) {
    return (
      <View
        style={{
          borderWidth: 2,
          borderColor: DEFAULT_CARD.border,
          backgroundColor: DEFAULT_CARD.bg,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: DEFAULT_CARD.text, lineHeight: 16 }}>{label}</Text>
      </View>
    );
  }
  const color = CATEGORY_COLORS[item.category] || DEFAULT_CARD.text;
  const card = CATEGORY_CARD[item.category] || DEFAULT_CARD;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: card.border,
        backgroundColor: card.bg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      <CareIcon paths={item.paths} color={color} size={24} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: card.text, lineHeight: 16, maxWidth: 160 }} numberOfLines={2}>
        {item.label}
      </Text>
    </View>
  );
}
