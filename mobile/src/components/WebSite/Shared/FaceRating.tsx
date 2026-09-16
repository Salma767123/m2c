import React from 'react';
import Svg, { Circle, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Palette } from '@/constants/theme';

export type FaceValue = 1 | 2 | 3 | 4 | 5;

export const FACE_LABELS: Record<FaceValue, string> = {
  5: 'Loved it',
  4: 'Liked it',
  3: "It's okay",
  2: 'Not great',
  1: 'Disappointed',
};

export const FACE_FILTER_LABELS: Record<FaceValue, string> = {
  5: 'Loved it',
  4: 'Liked it',
  3: "It's okay",
  2: 'Not great',
  1: 'Disappointed',
};

const WARM = ['#FFEE8C', '#FFD130', '#EFA024'];
const GREY = ['#EDE9E3', '#DCD5CC', '#C4BBB0'];
const INK = '#4a2f10';

export function FaceIcon({
  value,
  size = 20,
  muted = false,
}: {
  value: FaceValue;
  size?: number;
  muted?: boolean;
}) {
  const [c0, c1, c2] = muted ? GREY : WARM;
  const ink = muted ? '#9c9086' : INK;

  const eyes =
    value === 5 ? (
      <>
        <Path
          d="M6.7 10.2a2.3 2.3 0 0 1 4 0"
          stroke={ink}
          strokeWidth={1.7}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M13.3 10.2a2.3 2.3 0 0 1 4 0"
          stroke={ink}
          strokeWidth={1.7}
          strokeLinecap="round"
          fill="none"
        />
      </>
    ) : (
      <>
        <Ellipse cx="8.7" cy="9.9" rx="1.4" ry="1.75" fill={ink} />
        <Ellipse cx="15.3" cy="9.9" rx="1.4" ry="1.75" fill={ink} />
      </>
    );

  const mouth = {
    5: <Path d="M6.3 13.4h11.4a5.7 5.7 0 0 1-11.4 0Z" fill={ink} />,
    4: (
      <Path
        d="M8 14.2a4.5 4.5 0 0 0 8 0"
        stroke={ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
    ),
    3: (
      <Path
        d="M8.5 15h7"
        stroke={ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
    ),
    2: (
      <Path
        d="M8 16.1a4.5 4.5 0 0 1 8 0"
        stroke={ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
    ),
    1: (
      <Path
        d="M7.6 16.8a5.1 5.1 0 0 1 8.8 0"
        stroke={ink}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
    ),
  }[value];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <RadialGradient id={`faceGrad${value}`} cx="35%" cy="28%" r="78%">
        <Stop offset="0%" stopColor={c0} />
        <Stop offset="55%" stopColor={c1} />
        <Stop offset="100%" stopColor={c2} />
      </RadialGradient>
      <Circle cx="12" cy="12" r="11" fill={`url(#faceGrad${value})`} />
      <Ellipse
        cx="8.4"
        cy="6.3"
        rx="3.7"
        ry="2.2"
        fill="#fff"
        opacity={muted ? 0.35 : 0.3}
        transform="rotate(-24 8.4 6.3)"
      />
      {value === 1 ? (
        <>
          <Path d="M6.2 7.4L9.6 8.9" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M17.8 7.4L14.4 8.9" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : null}
      {eyes}
      {mouth}
    </Svg>
  );
}

export function positiveFace(average: number): FaceValue | null {
  if (!average || average < 3.5) return null;
  return average >= 4.5 ? 5 : 4;
}

export function FaceRatingRow({
  rating,
  reviewCount,
  size = 14,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
}) {
  const value = Number(rating) || 0;
  const face = positiveFace(value);

  if (!face || value <= 0) {
    return <Text style={[rs.ratingText, { fontSize: size + 2 }]}>New</Text>;
  }

  return (
    <View style={rs.row}>
      <FaceIcon value={face} size={size} />
      <Text style={[rs.ratingText, { fontSize: size - 2 }]}>
        {value.toFixed(1)}{reviewCount ? ` (${reviewCount})` : ''}
      </Text>
    </View>
  );
}

const rs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontWeight: '700', color: Palette.onBrand },
});

/**
 * One-tap input. "How was it?" and five faces beats a five-point judgement
 * on a star row. Controlled — the parent still stores a 1-5 number.
 * Best-first order (5, 4, 3, 2, 1).
 */
export function FacePicker({
  value,
  onChange,
  size = 44,
}: {
  value: number;
  onChange: (v: FaceValue) => void;
  size?: number;
}) {
  const shown = value as FaceValue || 0;

  return (
    <View>
      <View style={fs.pickerRow}>
        {([5, 4, 3, 2, 1] as FaceValue[]).map((v) => {
          const active = shown === v;
          return (
            <Pressable
              key={v}
              onPress={() => onChange(v)}
              accessibilityRole="button"
              accessibilityLabel={FACE_LABELS[v]}
              accessibilityState={{ selected: active }}
              style={[fs.pickerBtn, active && fs.pickerBtnActive]}
              android_ripple={{ color: 'rgba(224,26,27,0.07)' }}
            >
              <FaceIcon value={v} size={size * 0.56} muted={!active} />
            </Pressable>
          );
        })}
      </View>
      <View style={fs.pickerLabelRow}>
        <Text style={fs.pickerLabel}>
          {shown ? FACE_LABELS[shown as FaceValue] : '—'}
        </Text>
      </View>
    </View>
  );
}

const fs = StyleSheet.create({
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  pickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBtnActive: {
    backgroundColor: 'rgba(224,26,27,0.07)',
  },
  pickerLabelRow: {
    alignItems: 'center',
    minHeight: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a06a12',
  },
});

export default FaceRatingRow;
