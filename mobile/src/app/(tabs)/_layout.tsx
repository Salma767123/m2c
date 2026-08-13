import { Stack, usePathname } from 'expo-router';
import React, { useCallback, memo, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCart } from '@/context/CartContext';
import { Palette, Radius } from '@/constants/theme';
import {
  Home,
  ShoppingCart,
  User,
  Grid2X2,
  Package,
} from 'lucide-react-native';

/* ── Tab configuration (hoisted, allocated once) ──────────────────────── */
const TAB_CONFIG = [
  { name: 'index', label: 'Home', icon: Home, title: 'Home' },
  { name: 'categories', label: 'Category', icon: Grid2X2, title: 'Categories' },
  { name: 'cart', label: 'Cart', icon: ShoppingCart, title: 'Cart', badgeKey: 'cart' as const },
  { name: 'orders', label: 'Orders', icon: Package, title: 'Orders' },
  { name: 'profile', label: 'Profile', icon: User, title: 'Profile' },
] as const;

const TAB_COUNT = TAB_CONFIG.length;
const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };
/** Curve on the nav bar's top corners — mirrors HEADER_RADIUS in the header. */
const NAV_RADIUS = Radius.xl;

/* ── Badge component ─────────────────────────────────────────────────── */
const TabBadge = memo(function TabBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View className="absolute -top-1.5 -right-2.5" style={[ts.badge, { backgroundColor: color }]}>
      <Text style={ts.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
});

/* ── Individual tab button (memoized) ────────────────────────────────── */
interface TabItemProps {
  label: string;
  icon: any;
  isActive: boolean;
  badge?: number;
  badgeColor?: string;
  onPress: () => void;
}

const TabItem = memo(function TabItem({
  label, icon: Icon, isActive, badge, badgeColor, onPress,
}: TabItemProps) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isActive, progress]);

  // The indicator grows out of the centre rather than fading in — it reads as
  // the selection sliding across the bar even though each rail is per-tab.
  const animatedRailStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: progress.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isActive ? 1.12 : 1, SPRING_CONFIG) },
      { translateY: withSpring(isActive ? -1 : 0, SPRING_CONFIG) },
    ],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={ts.tabPressable}
    >
      {/* Brand rail above the active tab. Same accent language as the header's
          bottom edge and the drawer's brand rule. */}
      <Animated.View style={[ts.rail, animatedRailStyle]} />

      <Animated.View style={animatedIconStyle}>
        <View className="relative">
          <Icon
            color={isActive ? Palette.primary : Palette.textSubtle}
            size={22}
            strokeWidth={isActive ? 2.4 : 1.8}
          />
          {badge != null && badge > 0 ? (
            <TabBadge count={badge} color={badgeColor || Palette.primary} />
          ) : null}
        </View>
      </Animated.View>
      <Text
        style={[ts.label, isActive ? ts.labelActive : ts.labelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/* ── Helpers ──────────────────────────────────────────────────────────── */
function getActiveIndex(pathname: string): number {
  if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/') return 0;
  for (let i = 1; i < TAB_COUNT; i++) {
    if (pathname.includes(`/${TAB_CONFIG[i].name}`)) return i;
  }
  return 0;
}

/* ── Main layout ─────────────────────────────────────────────────────── */
export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();

  const activeIndex = getActiveIndex(pathname);
  const { width } = useWindowDimensions();
  const prevIndexRef = useRef(activeIndex);
  const activeIndexSV = useSharedValue(activeIndex);
  const isSwiping = useSharedValue(false);

  // Track direction for native slide animation
  const slideDirection = useRef<'slide_from_right' | 'slide_from_left'>('slide_from_right');

  useEffect(() => {
    activeIndexSV.value = activeIndex;
    prevIndexRef.current = activeIndex;
    isSwiping.value = false;
  }, [activeIndex]);

  const navigateToTab = useCallback(
    (index: number, direction: 'slide_from_right' | 'slide_from_left') => {
      slideDirection.current = direction;
      prevIndexRef.current = index;
      const tabName = TAB_CONFIG[index].name;
      const routePath = tabName === 'index' ? '/(tabs)/' : `/(tabs)/${tabName}`;
      router.replace(routePath as any);
    },
    [router],
  );

  const handleTabPress = useCallback(
    (tabName: string, tabIndex: number) => {
      const currentIndex = prevIndexRef.current;
      slideDirection.current = tabIndex > currentIndex ? 'slide_from_right' : 'slide_from_left';
      prevIndexRef.current = tabIndex;
      try {
        const routePath = tabName === 'index' ? '/(tabs)/' : `/(tabs)/${tabName}`;
        router.replace(routePath as any);
      } catch {
        router.push('/(tabs)/' as any);
      }
    },
    [router],
  );

  // Swipe gesture — triggers native slide animation
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (isSwiping.value) return;

      const fast = Math.abs(e.velocityX) > 500;
      const far = Math.abs(e.translationX) > width * 0.2;
      if (!fast && !far) return;

      const dir = e.translationX > 0 ? -1 : 1;
      const target = activeIndexSV.value + dir;
      if (target < 0 || target >= TAB_COUNT) return;

      isSwiping.value = true;
      const slideDir = dir > 0 ? 'slide_from_right' : 'slide_from_left';
      runOnJS(navigateToTab)(target, slideDir);
    });

  const getBadge = (tab: (typeof TAB_CONFIG)[number]) => {
    if (!('badgeKey' in tab) || tab.badgeKey == null) return undefined;
    return itemCount;
  };

  // The bar is white now, so badges can take their semantic colours directly:
  // amber for "items waiting" in the cart.
  const getBadgeColor = (tab: (typeof TAB_CONFIG)[number]) => {
    if (!('badgeKey' in tab) || tab.badgeKey == null) return undefined;
    return Palette.warning;
  };

  return (
    <GestureHandlerRootView style={ts.root}>
      <GestureDetector gesture={swipeGesture}>
        <View style={ts.content}>
          <Stack
            initialRouteName="index"
            screenOptions={{
              headerShown: false,
              contentStyle: { paddingBottom: 72 },
              animation: slideDirection.current,
              animationDuration: 200,
              gestureEnabled: false,
            }}
          >
            {TAB_CONFIG.map((tab) => (
              <Stack.Screen
                key={tab.name}
                name={tab.name}
                options={{ title: tab.title }}
              />
            ))}
          </Stack>
        </View>
      </GestureDetector>

      {/* Bottom Navigation */}
      <View
        style={[
          ts.navBar,
          { paddingBottom: Math.max(insets.bottom, 4) },
        ]}
      >
        <View style={ts.navInner}>
          {TAB_CONFIG.map((tab, idx) => (
            <TabItem
              key={tab.name}
              label={tab.label}
              icon={tab.icon}
              isActive={activeIndex === idx}
              badge={getBadge(tab)}
              badgeColor={getBadgeColor(tab)}
              onPress={() => handleTabPress(tab.name, idx)}
            />
          ))}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

/* ── Styles (hoisted, never re-allocated) ────────────────────────────── */
const ts = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    flex: 1,
  },
  /* The bar curves at the TOP, mirroring the header's curved bottom, so the
     content between them reads as a framed sheet. `overflow: 'hidden'` clips the
     active rail to that curve; the shadow therefore has to sit on this view
     WITHOUT the clip — RN draws an outer shadow fine here because the shadow is
     cast upward, away from the clipped region. */
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.surface,
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 16,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    paddingBottom: 2,
    borderTopLeftRadius: NAV_RADIUS,
    borderTopRightRadius: NAV_RADIUS,
    overflow: 'hidden',
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingTop: 9,
  },
  rail: {
    position: 'absolute',
    top: 0,
    width: 26,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
  },
  label: {
    marginTop: 3,
    fontSize: 9.5,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  labelInactive: {
    color: Palette.textSubtle,
    fontWeight: '500',
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Palette.surface,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Palette.onPrimary,
    lineHeight: 10,
  },
});
