/**
 * The app's one screen masthead.
 *
 * Every screen was drawing its own and no two agreed. Titles ran at 18, 22 and
 * 24pt, in weights 600, 700 and 800, in four different near-blacks, and three
 * of them carried no `fontFamily` at all — so those rendered in Roboto while
 * their neighbours rendered in Poppins. The leading mark was just as uneven: a
 * 48pt gradient chip on the cart, a bare 28pt glyph on orders, a plain circle
 * back button on the pushed screens, and nothing whatsoever on categories,
 * profile and the wishlist.
 *
 * This settles both: one type ramp, and a mark on every screen. Root screens
 * get their own glyph in the cart's gradient chip; screens you pushed into get
 * the back arrow in that same chip, so the shape of the header never moves.
 */
import React from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';

/* lucide-react-native declares LucideIcon internally but does not export it as
   a type, so the icon prop is typed structurally. */
type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/* The web's mark: a warm gradient chip carrying the glyph. */
const CHIP = ['#fdf1ef', '#f9e3df'] as const;
const CHIP_BORDER = '#f2d9d3';
const BRAND = '#e01a1b';

export default function ScreenHeader({
  icon: Icon,
  onBack,
  eyebrow,
  title,
  subtitle,
  trailing,
  right,
}: {
  /** Root-screen glyph. Ignored when `onBack` is given — that gets the arrow. */
  icon?: IconComponent;
  /** Pushed screens: renders a back arrow in the chip instead of `icon`. */
  onBack?: () => void;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned figure + caption, e.g. the order count. */
  trailing?: { value: string | number; label: string };
  /** Right-aligned action buttons (search, cart, share…). */
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.header, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          /* A style FUNCTION here would drop the chip's own styles — the
             failure this app has hit repeatedly. */
          style={s.chipPress}
        >
          <LinearGradient colors={CHIP} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.chip}>
            <ArrowLeft size={21} color={BRAND} strokeWidth={2.2} />
          </LinearGradient>
        </Pressable>
      ) : Icon ? (
        <LinearGradient colors={CHIP} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.chip}>
          <Icon size={21} color={BRAND} strokeWidth={1.9} />
        </LinearGradient>
      ) : null}

      <View style={s.titleWrap}>
        {eyebrow ? <Text style={s.eyebrow}>{eyebrow}</Text> : null}
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ? (
        <View style={s.trailing}>
          <Text style={s.trailingValue}>{trailing.value}</Text>
          <Text style={s.trailingLabel}>{trailing.label}</Text>
        </View>
      ) : null}

      {right ? <View style={s.right}>{right}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  chipPress: { borderRadius: 14 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CHIP_BORDER,
  },

  titleWrap: { flex: 1, minWidth: 0, marginLeft: 12 },
  eyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#b9a99b',
    marginBottom: 3,
  },
  /* `font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a]` —
     the web's page title, and now every screen's. */
  title: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    // Poppins is a static family: the weight must name the file that is loaded
    // (Poppins_600SemiBold), or Android synthesises a fake bold over it.
    fontWeight: '600',
    letterSpacing: -0.6,
    color: '#1a1a1a',
  },
  subtitle: { fontFamily: Fonts.sans, fontSize: 13, color: '#6b7280', marginTop: 2 },

  trailing: { alignItems: 'flex-end', marginLeft: 12 },
  trailingValue: {
    fontFamily: Fonts.sansBold,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#1a1a1a',
  },
  trailingLabel: { fontFamily: Fonts.sans, fontSize: 11.5, color: '#475569' },

  right: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
});
