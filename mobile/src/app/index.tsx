import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Fonts } from '@/constants/theme';
import { userAuthService } from '@/services/userAuthService';

/**
 * The opening screen: the loom threads the mark into being.
 *
 * ── The idea ────────────────────────────────────────────────────────────────
 * This is a handloom marketplace whose own logo is a weaver at a loom and whose
 * line is "Weave Your Story With Threads". A generic spinner says nothing about
 * that. So the loading state IS a weave: warp columns thread in alternately
 * from top and bottom, a red shuttle crosses them, and the cloth settles behind
 * the mark.
 *
 * ── Why these numbers ───────────────────────────────────────────────────────
 * They are the web's, from HeroSection.tsx, which uses the same weave between
 * banners — so the app opens in the grammar the site already speaks. Its notes
 * are worth keeping:
 *
 *   STRIPS = 10     "Twelve looked busy on a phone; eight lost the effect."
 *   WEAVE_MS = 450  how long one column takes
 *   STAGGER = 28    the beat between columns — "the gap between them is what
 *                   you actually read as weaving"; slow the columns alone and
 *                   they overlap into a single soft wipe.
 *   WEAVE_RUN       columns deliberately travel different distances, so they
 *                   move at different speeds over the same duration: "every one
 *                   arriving from exactly one frame-height away made the weave
 *                   read as a machine shutter".
 *
 * ── Continuity ──────────────────────────────────────────────────────────────
 * The logo and its red rule are at full opacity from the first frame, in the
 * same place and at the same size as the native splash's static image. The
 * native splash is effectively this screen's first frame; the weave then starts
 * behind it. Nothing cuts.
 */
const STRIPS = 10;
const WEAVE_MS = 450;
const WEAVE_STAGGER = 28;
const WEAVE_RUN = [101, 138, 116, 165];

const BRAND = '#e01a1b';
const INK = '#1a1a1a';
const MUTED = '#5f5550';

/** Warm near-whites. The cloth has to read as texture on white without ever
 *  competing with black line art sitting on top of it. */
const WARP = ['#faf7f3', '#f4efe8'];

const RULE_W = 78;
const RULE_H = 4;

export default function AnimatedSplash() {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  const logoScale = useRef(new Animated.Value(0.96)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(12)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const rulePulse = useRef(new Animated.Value(0.3)).current;

  // One value per warp column, 0 → 1.
  const warp = useRef(
    Array.from({ length: STRIPS }, () => new Animated.Value(0)),
  ).current;
  // The shuttle: a red weft line crossing the cloth.
  const shuttle = useRef(new Animated.Value(0)).current;

  const logoW = Math.min(width * 0.58, 260);
  const stripW = Math.ceil(width / STRIPS) + 1; // +1 so rounding never shows a seam

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      // Settled, not animated: the cloth is woven, the type is in place.
      warp.forEach((v) => v.setValue(1));
      shuttle.setValue(1);
      logoScale.setValue(1);
      titleFade.setValue(1);
      titleSlide.setValue(0);
      footerFade.setValue(1);
      rulePulse.setValue(1);
    } else {
      // The weave.
      Animated.stagger(
        WEAVE_STAGGER,
        warp.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: WEAVE_MS,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ),
      ).start();

      // The shuttle crosses once the cloth is mostly there.
      Animated.sequence([
        Animated.delay(WEAVE_MS * 0.6),
        Animated.timing(shuttle, {
          toValue: 1,
          duration: 820,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(260),
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            tension: 70,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(titleFade, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(titleSlide, {
            toValue: 0,
            duration: 420,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
        Animated.timing(footerFade, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();

      // The rule keeps time while the session check runs.
      Animated.loop(
        Animated.sequence([
          Animated.timing(rulePulse, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(rulePulse, {
            toValue: 0.3,
            duration: 850,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ).start();
    }

    const timer = setTimeout(async () => {
      const authenticated = await userAuthService.isAuthenticated();
      router.replace(authenticated ? '/(tabs)' : '/(auth)/Login');
    }, 2200);

    return () => clearTimeout(timer);
  }, [reduceMotion, warp, shuttle, logoScale, titleFade, titleSlide, footerFade, rulePulse]);

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* ── The cloth ──────────────────────────────────────────────────────
          Ten warp columns, alternating in from top and bottom a beat apart. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {warp.map((v, i) => {
          const fromTop = i % 2 === 0;
          const run = WEAVE_RUN[i % WEAVE_RUN.length];
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left: i * (width / STRIPS),
                top: 0,
                width: stripW,
                height,
                backgroundColor: WARP[i % WARP.length],
                opacity: v,
                transform: [
                  {
                    translateY: v.interpolate({
                      inputRange: [0, 1],
                      // Percent of the run, so a tall screen scales with it.
                      outputRange: [fromTop ? -(height * run) / 100 : (height * run) / 100, 0],
                    }),
                  },
                ],
              }}
            />
          );
        })}

        {/* The shuttle — one red weft pass across the warp. */}
        <Animated.View
          style={{
            position: 'absolute',
            top: height * 0.5 - 1,
            left: -width * 0.35,
            width: width * 0.35,
            height: 2,
            backgroundColor: BRAND,
            opacity: shuttle.interpolate({
              inputRange: [0, 0.12, 0.85, 1],
              outputRange: [0, 0.55, 0.55, 0],
            }),
            transform: [
              {
                translateX: shuttle.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width * 1.4],
                }),
              },
            ],
          }}
        />
      </View>

      {/* ── The mark ───────────────────────────────────────────────────────
          Opacity 1 from frame one so it lines up with the native splash. */}
      <View style={st.center}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image
            source={require('../../assets/images/logo4.png')}
            style={{ width: logoW, height: logoW * 0.62 }}
            resizeMode="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="M2C MarkDowns"
          />
        </Animated.View>

        {/* The rule baked into the native splash image, continuing here as the
            loader rather than as a second, unrelated spinner. */}
        <Animated.View style={[st.rule, { transform: [{ scaleX: rulePulse }] }]} />

        <Animated.View
          style={{ opacity: titleFade, transform: [{ translateY: titleSlide }] }}
        >
          <Text style={st.title}>M2C MarkDowns</Text>
          <Text style={st.subtitle}>Weave Your Story With Threads</Text>
        </Animated.View>
      </View>

      <Animated.View style={[st.footer, { opacity: footerFade }]}>
        <Text style={st.footerText}>Direct From Manufacturer To Customer</Text>
        <Text style={st.footerCopy}>
          {'©'} {new Date().getFullYear()} M2C MarkDowns Private Limited
        </Text>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  rule: {
    width: RULE_W,
    height: RULE_H,
    borderRadius: RULE_H / 2,
    backgroundColor: BRAND,
    marginTop: 26,
    marginBottom: 26,
  },

  title: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 6,
  },

  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: BRAND,
    textAlign: 'center',
  },
  footerCopy: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 5,
  },
});
