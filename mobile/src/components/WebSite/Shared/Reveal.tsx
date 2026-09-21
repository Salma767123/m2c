/**
 * Scroll-triggered entrance animations, matching the web's.
 *
 * The web gives every home section an entrance that fires when it scrolls into
 * view — an IntersectionObserver adds `.is-in` to the grid and the CSS
 * animations run from there. Mobile had entrances on exactly two components
 * (HeroSection and PromoStrip); every rail, card and tile below the fold simply
 * appeared.
 *
 * ── Why this is not just "animate on mount" ─────────────────────────────────
 * In a React Native ScrollView every child mounts at once, so a mount-triggered
 * animation fires for the whole page while the user is still looking at the
 * hero, and is long finished by the time they reach it. That is precisely the
 * bug the web documents about the component this replaces: a timer-based reveal
 * "fires on a timer regardless of scroll position — so by the time you scrolled
 * here it had already revealed and nothing animated".
 *
 * So the trigger is real scroll position. <RevealScrollView> publishes its
 * offset and viewport height through context; each <Reveal> measures its own
 * position with onLayout and starts when it actually enters the viewport.
 * Each one runs once and stays put.
 *
 * ── Curves ──────────────────────────────────────────────────────────────────
 * The two cubic-beziers below are the web's, copied rather than approximated:
 *   cubic-bezier(0.22, 0.72, 0.24, 1)   tiles (Category)
 *   cubic-bezier(0.22, 0.94, 0.30, 1)   cards (Best Sellers, Top Selling)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';

/** The web's tile curve — cubic-bezier(0.22, 0.72, 0.24, 1). */
export const EASE_TILE = Easing.bezier(0.22, 0.72, 0.24, 1);
/** The web's card curve — cubic-bezier(0.22, 0.94, 0.30, 1). */
export const EASE_CARD = Easing.bezier(0.22, 0.94, 0.3, 1);

type Ctx = {
  /** Current scroll offset, in px. */
  scrollY: number;
  /** Height of the scroll viewport, in px. */
  viewportH: number;
  /** True once the user has motion reduced — everything renders settled. */
  reduceMotion: boolean;
  /** Whether a scroll container is actually present above us. */
  present: boolean;
  /** The ScrollView's content view, to measure positions against. */
  contentRef: React.RefObject<View | null> | null;
};

const RevealContext = createContext<Ctx>({
  scrollY: 0,
  viewportH: 0,
  reduceMotion: false,
  present: false,
  contentRef: null,
});

/**
 * A ScrollView that drives the reveals inside it.
 *
 * Drop-in for ScrollView — it forwards every prop through and only adds the
 * scroll tracking. `scrollEventThrottle` defaults to 16 so the trigger check
 * runs about once a frame.
 */
export function RevealScrollView({
  children,
  onScroll,
  onLayout,
  scrollEventThrottle = 16,
  ...rest
}: ScrollViewProps & { children: React.ReactNode }) {
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { height: windowH } = useWindowDimensions();

  // Honour the OS "reduce motion" switch, as the web honours
  // prefers-reduced-motion in each of these components.
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduceMotion(!!v),
    );
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollY(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [onScroll],
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      setViewportH(e.nativeEvent.layout.height);
      onLayout?.(e);
    },
    [onLayout],
  );

  const contentRef = useRef<View | null>(null);

  const value = useMemo<Ctx>(
    () => ({
      contentRef,
      scrollY,
      // Before the first layout lands, fall back to the window height so a
      // reveal sitting on screen at startup still has a sane viewport to test
      // against instead of measuring itself against zero.
      viewportH: viewportH || windowH,
      reduceMotion,
      present: true,
    }),
    [scrollY, viewportH, windowH, reduceMotion],
  );

  return (
    <RevealContext.Provider value={value}>
      <ScrollView {...rest} onScroll={handleScroll} onLayout={handleLayout} scrollEventThrottle={scrollEventThrottle}>
        {/* Everything is measured against this view, so a Reveal can sit at any
            depth and still know where it is in the scrolled content. */}
        <View ref={contentRef} collapsable={false}>
          {children}
        </View>
      </ScrollView>
    </RevealContext.Provider>
  );
}

export type RevealProps = {
  children: React.ReactNode;
  /** Distance risen from, in px. The web uses 22 for tiles, 26 for cards. */
  distance?: number;
  /** Starting scale. The web's card entrance comes up from .97. */
  fromScale?: number;
  /** Duration in ms — the web's per-section CARD_MS / TILE_MS. */
  duration?: number;
  /** Delay in ms — the web's `--d`, i.e. begin + index × stagger. */
  delay?: number;
  easing?: (v: number) => number;
  style?: any;
  /** How far into the viewport the element must come before it starts. */
  threshold?: number;
};

/**
 * Rises and fades its children in when they scroll into view.
 *
 * Uses the JS Animated driver rather than Reanimated purely because it is what
 * the two already-animated components on this screen use; `useNativeDriver` is
 * on, so opacity and transform still run off the JS thread.
 */
export function Reveal({
  children,
  distance = 22,
  fromScale,
  duration = 700,
  delay = 0,
  easing = EASE_TILE,
  style,
  threshold = 60,
}: RevealProps) {
  const { scrollY, viewportH, reduceMotion, present, contentRef } =
    useContext(RevealContext);
  const progress = useRef(new Animated.Value(0)).current;
  const [top, setTop] = useState<number | null>(null);
  const started = useRef(false);
  const selfRef = useRef<View | null>(null);

  /**
   * Position within the SCROLL CONTENT, not within the parent.
   *
   * `onLayout` reports a y relative to the immediate parent, and no Reveal in
   * this app is a direct child of the scroll content — they sit inside section
   * cards, grids and wrappers. So every one of them reported a y of roughly
   * zero, the viewport test passed at mount, and the whole page's entrances
   * fired while the user was still looking at the hero. Measuring against the
   * content view is what actually makes this scroll-triggered.
   */
  const handleLayout = useCallback(() => {
    const node = contentRef?.current;
    if (!node || !selfRef.current) return;
    // measureLayout is async; a failure callback means the node is gone, in
    // which case leaving `top` null is correct — the effect below will not fire.
    selfRef.current.measureLayout(
      node as any,
      (_x: number, y: number) => setTop(y),
      () => {},
    );
  }, [contentRef]);

  useEffect(() => {
    if (started.current) return;

    // No scroll container above us, or motion is reduced: show it settled.
    // Never leave content stuck at opacity 0 because a trigger never fired.
    if (!present || reduceMotion) {
      started.current = true;
      progress.setValue(1);
      return;
    }

    if (top == null || viewportH === 0) return;
    if (top > scrollY + viewportH - threshold) return;

    started.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing,
      useNativeDriver: true,
    }).start();
  }, [top, scrollY, viewportH, present, reduceMotion, duration, delay, easing, threshold, progress]);

  const transform: any[] = [
    {
      translateY: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [distance, 0],
      }),
    },
  ];
  if (fromScale != null) {
    transform.push({
      scale: progress.interpolate({ inputRange: [0, 1], outputRange: [fromScale, 1] }),
    });
  }

  return (
    <Animated.View
      ref={selfRef as any}
      collapsable={false}
      onLayout={handleLayout}
      style={[style, { opacity: progress, transform }]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A plain (non-animating) wrapper with the same layout footprint.
 *
 * Handy where a section needs the onLayout position but no entrance.
 */
export function RevealGroup({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={style}>{children}</View>;
}

/* ── Featured's cloth unroll ─────────────────────────────────────────────── */

/**
 * Featured Products' entrance: the card starts under a panel of cloth with a
 * rolled edge at its top, and the roll travels top-to-bottom, taking the cloth
 * off the card — a bolt of fabric unrolled onto a table. Cards stagger so it
 * reads left-to-right as a wave.
 *
 * This is a different effect from the rise used by the other rails, which is
 * the point: the web gives each of its three product sections its own entrance
 * so they do not read as one section printed three times.
 *
 * Web equivalents: `@keyframes m2cUnrollCloth` (translateY 0 → 100%) with
 * `m2cUnrollFade` (opaque until 88%, then out), over UNROLL_MS.
 */
export function UnrollReveal({
  children,
  duration = 950,
  delay = 0,
  style,
  threshold = 60,
}: {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: any;
  threshold?: number;
}) {
  const { scrollY, viewportH, reduceMotion, present, contentRef } =
    useContext(RevealContext);
  const progress = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState<{ y: number; h: number } | null>(null);
  const started = useRef(false);
  const selfRef = useRef<View | null>(null);

  // Content-relative, for the same reason as <Reveal> above. The height comes
  // from the same measurement, so the cloth is always exactly card-height.
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      const node = contentRef?.current;
      if (!node || !selfRef.current) {
        setBox({ y: e.nativeEvent.layout.y, h });
        return;
      }
      selfRef.current.measureLayout(
        node as any,
        (_x: number, y: number) => setBox({ y, h }),
        () => {},
      );
    },
    [contentRef],
  );

  useEffect(() => {
    if (started.current) return;
    if (!present || reduceMotion) {
      started.current = true;
      progress.setValue(1);
      return;
    }
    if (!box || viewportH === 0) return;
    if (box.y > scrollY + viewportH - threshold) return;

    started.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: EASE_TILE,
      useNativeDriver: true,
    }).start();
  }, [box, scrollY, viewportH, present, reduceMotion, duration, delay, threshold, progress]);

  // The cloth slides its own full height downward, so it clears the card.
  const clothH = box?.h ?? 0;

  return (
    <View
      ref={selfRef}
      collapsable={false}
      onLayout={handleLayout}
      style={[style, { overflow: 'hidden' }]}
    >
      {children}

      {clothH > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: clothH,
            // Holds fully opaque until near the end, then lifts — the web's
            // 0%,88% { opacity: 1 } → 100% { opacity: 0 }.
            opacity: progress.interpolate({
              inputRange: [0, 0.88, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, clothH],
                }),
              },
            ],
          }}
        >
          {/* The cloth. The web layers two 9px repeating gratings over a
              vertical gradient to suggest a weave; a single gradient is the
              closest equivalent here without shipping an image. */}
          <LinearGradient
            colors={['#e6d8c6', '#c7b19a']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          {/* The rolled end of the bolt, wider than the card so it reads as a
              cylinder rather than a band. */}
          <LinearGradient
            colors={['#f2e8db', '#c2ab92', '#98805f']}
            locations={[0, 0.52, 1]}
            style={{
              position: 'absolute',
              left: '-3%',
              right: '-3%',
              top: 0,
              height: 12,
              borderRadius: 999,
              shadowColor: '#4a3226',
              shadowOffset: { width: 0, height: 9 },
              shadowOpacity: 0.6,
              shadowRadius: 10,
              elevation: 6,
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
