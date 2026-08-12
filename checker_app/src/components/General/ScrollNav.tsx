// Floating top/bottom scroll navigation.
//
// useScrollNav() tracks the position of a ScrollView (via its ref + onScroll)
// and ScrollNavButton renders a small floating pill that, when the view is at
// the top, shows a down arrow to jump to the bottom, and when at the bottom,
// shows an up arrow to jump back to the top. Both the Product Inspection Form
// steps and the Product Detail screen share it.

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ArrowDown, ArrowUp } from 'lucide-react-native';

export interface ScrollNavHandlers {
  ref: React.RefObject<ScrollView | null>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

/** Window-space rect of a host node, or null if it is gone / unmeasurable. */
function measureInWindow(node: any): Promise<{ x: number; y: number; w: number; h: number } | null> {
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

export function useScrollNav() {
  const scrollRef = useRef<ScrollView>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  // scrollTo() needs an absolute offset, but a measured node only tells us how
  // far it sits from the viewport — so the live offset has to be tracked.
  const offsetY = useRef(0);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    offsetY.current = contentOffset.y;
    setAtTop(contentOffset.y <= 0);
    setAtBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 4);
  }, []);

  const reset = useCallback(() => {
    setAtTop(true);
    setAtBottom(false);
    // A fresh ScrollView starts at 0. Without this the stale offset from the
    // previous step would throw off scrollToNode's arithmetic.
    offsetY.current = 0;
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  /**
   * Bring a measurable host node into view, centred when it fits — the RN
   * equivalent of scrollIntoView({ block: 'center' }). Measures the node and the
   * scroll viewport in window space and scrolls by the difference, so it works
   * regardless of how deeply the node is nested. Resolves false when either
   * measurement fails, letting the caller fall back to scrolling to the top.
   */
  const scrollToNode = useCallback(async (node: any, gap = 24): Promise<boolean> => {
    const scroller = scrollRef.current;
    if (!scroller || !node) return false;

    // The ScrollView class has no measureInWindow — its host node does.
    const host: any =
      typeof (scroller as any).getNativeScrollRef === 'function'
        ? (scroller as any).getNativeScrollRef()
        : scroller;

    const [field, frame] = await Promise.all([measureInWindow(node), measureInWindow(host)]);
    if (!field || !frame) return false;

    // Centre it when there is room; otherwise pin it just below the top edge so
    // a tall section still starts on screen rather than scrolling past it.
    const inset = field.h < frame.h - gap * 2 ? (frame.h - field.h) / 2 : gap;
    const delta = field.y - frame.y - inset;
    scroller.scrollTo({ y: Math.max(0, offsetY.current + delta), animated: true });
    return true;
  }, []);

  // Props safe to spread straight onto a ScrollView.
  const handlers: ScrollNavHandlers = { ref: scrollRef, onScroll, scrollEventThrottle: 16 };

  return { handlers, atTop, atBottom, reset, scrollToTop, scrollToBottom, scrollToNode };
}

/**
 * Floating pill rendered at the bottom-right of a scroll container. Shows a
 * down arrow while the content isn't at its end (tap → scroll to bottom) and
 * an up arrow once at the bottom (tap → back to top). Hidden entirely when the
 * content fits on screen (atTop && atBottom).
 */
export function ScrollNavButton({
  nav,
  bottom = 12,
  right = 12,
  style,
}: {
  nav: ReturnType<typeof useScrollNav>;
  bottom?: number;
  right?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const showDown = !nav.atBottom;
  const visible = !(nav.atTop && nav.atBottom);
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', right, bottom, zIndex: 50 }, style]}>
      <TouchableOpacity
        onPress={showDown ? nav.scrollToBottom : nav.scrollToTop}
        accessibilityRole="button"
        accessibilityLabel={showDown ? 'Scroll to bottom' : 'Scroll to top'}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#e01a1b',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        {showDown ? <ArrowDown size={18} color="#ffffff" strokeWidth={2.5} /> : <ArrowUp size={18} color="#ffffff" strokeWidth={2.5} />}
      </TouchableOpacity>
    </View>
  );
}
