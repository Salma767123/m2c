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
  interpolateColor,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import {
  Home,
  ShoppingCart,
  User,
  Grid2X2,
  Package,
  Heart,
} from 'lucide-react-native';

/* ── Tab configuration (hoisted, allocated once) ──────────────────────── */
const TAB_CONFIG = [
  { name: 'index', label: 'Home', icon: Home, title: 'Home' },
  { name: 'categories', label: 'Category', icon: Grid2X2, title: 'Categories' },
  { name: 'wishlist', label: 'Wishlist', icon: Heart, title: 'Wishlist', badgeKey: 'wishlist' as const },
  { name: 'cart', label: 'Cart', icon: ShoppingCart, title: 'Cart', badgeKey: 'cart' as const },
  { name: 'orders', label: 'Orders', icon: Package, title: 'Orders' },
  { name: 'profile', label: 'Profile', icon: User, title: 'Profile' },
] as const;

const TAB_COUNT = TAB_CONFIG.length;
const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.8 };

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

  const animatedPillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', '#111827'],
    ),
    transform: [{ scale: withSpring(isActive ? 1 : 0.95, SPRING_CONFIG) }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isActive ? 1.1 : 1, SPRING_CONFIG) },
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
      <Animated.View style={[ts.pill, animatedPillStyle]}>
        <Animated.View style={animatedIconStyle}>
          <View className="relative">
            <Icon
              color={isActive ? '#ffffff' : '#9ca3af'}
              size={21}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            {badge != null && badge > 0 ? (
              <TabBadge count={badge} color={badgeColor || '#ef4444'} />
            ) : null}
          </View>
        </Animated.View>
        <Text
          style={[
            ts.label,
            isActive ? ts.labelActive : ts.labelInactive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
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
  const { wishlistCount } = useWishlist();

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
    return tab.badgeKey === 'cart' ? itemCount : wishlistCount;
  };

  const getBadgeColor = (tab: (typeof TAB_CONFIG)[number]) => {
    if (!('badgeKey' in tab) || tab.badgeKey == null) return undefined;
    return tab.badgeKey === 'cart' ? '#f59e0b' : '#ef4444';
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
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  navBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 2,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 44,
  },
  label: {
    marginTop: 2,
    fontSize: 9.5,
    letterSpacing: 0,
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  labelInactive: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 10,
  },
});
