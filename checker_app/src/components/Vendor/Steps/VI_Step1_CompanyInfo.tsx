// Keyboard-aware scrolling for the vendor-inspection step forms.
//
// Problem: every VerifyField card can open a required "Reason" TextInput, and
// Step 8 ends with the overall-remarks box. When one of those sits low on the
// screen the soft keyboard covers it and the checker types blind.
//
// Fix: the inspection screen swaps its plain <ScrollView> for
// <KeyboardAwareScrollView>. Any input rendered below it calls
// useKeyboardAwareField(), which returns a ref + onFocus pair. On focus the
// provider measures the input against the live keyboard frame and scrolls by
// exactly the overlap — no jumping when the field is already visible.
//
// Everything is pure JS/RN, so it works in Expo Go with no extra native deps.

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, Keyboard, Platform, ScrollView } from 'react-native';
import type {
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';

/** Anything that can be measured — a TextInput or View host ref. */
export type MeasurableRef = {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
} | null;

type Box = { x: number; y: number; w: number; h: number };

type KeyboardScrollCtxValue = {
  /** Scroll a node above the keyboard right now (used for reveal-on-appear). */
  scrollFieldIntoView: (node: MeasurableRef, extraOffset?: number) => void;
  /** Remember the focused node so it is revealed once the keyboard frame lands. */
  trackFocusedField: (node: MeasurableRef, extraOffset?: number) => void;
  keyboardVisible: boolean;
};

const KeyboardScrollCtx = createContext<KeyboardScrollCtxValue | null>(null);

// Breathing room left under a revealed field so it never sits flush against
// the keyboard — enough to still see the next line of a multiline box.
const DEFAULT_OFFSET = 24;

// Promise wrapper so a measure chain reads top-to-bottom instead of nesting.
// Resolves null when the node is gone or the platform hands back garbage.
function measureNode(node: any): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    try {
      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        const ok = [x, y, w, h].every((n) => typeof n === 'number' && !Number.isNaN(n));
        resolve(ok ? { x, y, w, h } : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /** Extra gap above the keyboard, on top of each field's own offset. */
  extraScrollHeight?: number;
}

/**
 * Drop-in replacement for <ScrollView> that keeps the focused input visible.
 * Forwards its ref, so existing scrollTo / scrollToEnd calls keep working.
 */
export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    {
      children,
      contentContainerStyle,
      onScroll,
      scrollEventThrottle = 16,
      keyboardShouldPersistTaps = 'handled',
      keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
      extraScrollHeight = 0,
      ...rest
    },
    forwardedRef,
  ) {
    const scrollRef = useRef<ScrollView | null>(null);
    useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView, []);

    // Live scroll offset — scrollTo needs an absolute y, and we only ever know
    // the field's delta, so the current offset has to be tracked.
    const scrollY = useRef(0);
    // Screen-y of the keyboard's top edge; Infinity while it is hidden.
    const keyboardTop = useRef(Number.POSITIVE_INFINITY);
    const focusedField = useRef<{ node: MeasurableRef; offset: number } | null>(null);

    const [bottomInset, setBottomInset] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // The ScrollView class itself has no measureInWindow — the host node does.
    const nativeScrollNode = useCallback(() => {
      const s: any = scrollRef.current;
      if (!s) return null;
      return typeof s.getNativeScrollRef === 'function' ? s.getNativeScrollRef() : s;
    }, []);

    // Padding equal to however much of the scroll view the keyboard actually
    // covers. On Android with adjustResize the view already shrank, so this
    // lands on 0 and nothing is double-counted; on iOS it is the real overlap.
    const syncInset = useCallback(async () => {
      if (!Number.isFinite(keyboardTop.current)) {
        setBottomInset(0);
        return;
      }
      const frame = await measureNode(nativeScrollNode());
      const winH = Dimensions.get('window').height;
      const bottom = frame ? frame.y + frame.h : winH;
      setBottomInset(Math.round(Math.max(0, bottom - keyboardTop.current)));
    }, [nativeScrollNode]);

    const scrollFieldIntoView = useCallback(
      async (node: MeasurableRef, extraOffset: number = DEFAULT_OFFSET) => {
        const scroller = scrollRef.current;
        if (!scroller || !node) return;

        const box = await measureNode(node);
        if (!box) return;
        const frame = await measureNode(nativeScrollNode());

        const winH = Dimensions.get('window').height;
        const containerTop = frame ? frame.y : 0;
        const containerBottom = frame ? frame.y + frame.h : winH;
        // Whichever cuts the content off first — the scroll view's own bottom
        // edge, or the keyboard sitting on top of it.
        const visibleBottom = Math.min(containerBottom, keyboardTop.current);

        const gap = extraOffset + extraScrollHeight;
        const fieldBottom = box.y + box.h + gap;

        let delta = 0;
        if (fieldBottom > visibleBottom) {
          delta = fieldBottom - visibleBottom;
        } else if (box.y - 12 < containerTop) {
          // Field is hiding above the fold (e.g. after the keyboard resized
          // the window) — nudge it back down.
          delta = box.y - 12 - containerTop;
        }
        if (Math.abs(delta) < 2) return;

        scroller.scrollTo({ y: Math.max(0, scrollY.current + delta), animated: true });
      },
      [extraScrollHeight, nativeScrollNode],
    );

    const trackFocusedField = useCallback(
      (node: MeasurableRef, extraOffset: number = DEFAULT_OFFSET) => {
        focusedField.current = { node, offset: extraOffset };
        // Keyboard already up (tabbing between inputs): reveal immediately.
        // Otherwise the show listener below does it once the frame is known.
        if (Number.isFinite(keyboardTop.current)) {
          setTimeout(() => scrollFieldIntoView(node, extraOffset), 60);
        }
      },
      [scrollFieldIntoView],
    );

    useEffect(() => {
      // iOS reports the frame before the animation, Android only after it.
      const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

      const onShow = (e: KeyboardEvent) => {
        keyboardTop.current = e.endCoordinates.screenY;
        setKeyboardVisible(true);
        // Android resizes the window on show — measure after it settles.
        setTimeout(syncInset, Platform.OS === 'android' ? 60 : 0);
        const f = focusedField.current;
        if (f) {
          setTimeout(
            () => scrollFieldIntoView(f.node, f.offset),
            Platform.OS === 'android' ? 140 : 40,
          );
        }
      };

      const onHide = () => {
        keyboardTop.current = Number.POSITIVE_INFINITY;
        focusedField.current = null;
        setKeyboardVisible(false);
        setBottomInset(0);
      };

      const showSub = Keyboard.addListener(showEvt, onShow);
      const hideSub = Keyboard.addListener(hideEvt, onHide);
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [scrollFieldIntoView, syncInset]);

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      },
      [onScroll],
    );

    const ctx = useMemo<KeyboardScrollCtxValue>(
      () => ({ scrollFieldIntoView, trackFocusedField, keyboardVisible }),
      [scrollFieldIntoView, trackFocusedField, keyboardVisible],
    );

    return (
      <KeyboardScrollCtx.Provider value={ctx}>
        <ScrollView
          {...rest}
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode={keyboardDismissMode}
          contentContainerStyle={[
            contentContainerStyle,
            bottomInset > 0 ? { paddingBottom: bottomInset } : null,
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardScrollCtx.Provider>
    );
  },
);

/**
 * Wire an input into the nearest KeyboardAwareScrollView.
 *
 *   const { ref, onFocus } = useKeyboardAwareField<TextInput>();
 *   <TextInput ref={ref} onFocus={onFocus} … />
 *
 * `reveal()` scrolls the field into view without waiting for focus — used when
 * an input appears mid-list (the Reason box after tapping No).
 * Safe with no provider above it: the handlers become no-ops.
 */
export function useKeyboardAwareField<T = any>(extraOffset: number = DEFAULT_OFFSET) {
  const ctx = useContext(KeyboardScrollCtx);
  const ref = useRef<T | null>(null);

  const onFocus = useCallback(() => {
    ctx?.trackFocusedField(ref.current as MeasurableRef, extraOffset);
  }, [ctx, extraOffset]);

  const reveal = useCallback(() => {
    ctx?.scrollFieldIntoView(ref.current as MeasurableRef, extraOffset);
  }, [ctx, extraOffset]);

  return { ref, onFocus, reveal, enabled: !!ctx };
}

/** Imperative escape hatch for revealing a node you already hold a ref to. */
export function useScrollFieldIntoView() {
  const ctx = useContext(KeyboardScrollCtx);
  return ctx?.scrollFieldIntoView ?? (() => {});
}

export function useKeyboardVisible(): boolean {
  return useContext(KeyboardScrollCtx)?.keyboardVisible ?? false;
}