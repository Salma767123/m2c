import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Package,
  User as UserIcon,
  ShoppingCart,
  Heart,
  LogIn,
  Percent,
  LifeBuoy,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Palette, Radius, Shadow } from '@/constants/theme';
import { categoryService, type Category } from '@/services/categoryService';
import { userAuthService } from '@/services/userAuthService';
import { companyInfoService } from '@/services/companyInfoService';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 340);

/** Echoes the curve on the app header. Only the RIGHT corners are rounded — the
 *  left edge is flush against the screen. */
const PANEL_RADIUS = Radius.xl;

/** Brand-tinted press feedback, so ripples read as part of the theme rather than
 *  a neutral grey wash. */
const RIPPLE = { color: 'rgba(224,26,27,0.07)' };

/** Header panel — the same dark gradient the notice cards use, so the drawer's
 *  opening reads as part of the brand rather than a plain white slab. */
const HEADER_GRADIENT: [string, string] = ['#1f2937', '#000000'];

/** One shared `progress` value drives every row's entrance: each entry fades
 *  and slides in a beat after the one above it, like a menu being dealt in. */
const STAGGER_STEP = 0.06;
const STAGGER_SPAN = 0.18;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Load dynamic company logo (cached first, then fresh from API)
  useEffect(() => {
    companyInfoService.getCachedCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    });
    companyInfoService.getPublicCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const auth = await userAuthService.isAuthenticated();
        setIsAuth(auth);
        if (auth) {
          const data = await userAuthService.getUserData();
          if (data) {
            setUserName(data.name || '');
            setUserEmail(data.email || '');
          }
        }
      } catch { /* ignore */ }
    })();
  }, [visible]);

  useEffect(() => {
    if (categories.length > 0) return;
    (async () => {
      try {
        setLoadingCats(true);
        const res = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc',
        });
        if (res.success && res.data) setCategories(res.data);
      } catch { /* ignore */ }
      finally { setLoadingCats(false); }
    })();
  }, []);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateX.setValue(-SIDEBAR_WIDTH);
      overlayOpacity.setValue(0);
      progress.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: 460, useNativeDriver: true }),
      ]).start();
    } else {
      progress.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, { toValue: -SIDEBAR_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  const go = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 280);
  };

  const statusBarH = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 50;
  const initials = userName
    ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  // Render-order counter → each piece gets its own stagger slot.
  let order = -1;
  const next = () => ++order;

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Scrim */}
      <Animated.View style={[s.scrim, { opacity: overlayOpacity }]}>
        <Pressable style={s.fill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      {/* Panel. Split in two like the app header: the outer view carries the
          shadow, the inner one clips to the rounded right edge — on iOS a single
          view can't do both, because `overflow: 'hidden'` also clips the shadow. */}
      <Animated.View style={[s.panel, { transform: [{ translateX }] }]}>
        <View style={s.panelClip}>
          {/* ── Brand block ──────────────────────────────────────────────────
              Dark gradient header with the logo floating on a white plate —
              the logo is black line art, so it needs the pale backing, while
              the plate's shadow separates it from the dark panel. */}
          <LinearGradient
            colors={HEADER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.brandBlock, { paddingTop: statusBarH + 18 }]}
          >
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              hitSlop={8}
              style={s.closeHit}
            >
              <View style={s.closeChip}>
                <X size={16} color={Palette.onInverse} />
              </View>
            </Pressable>

            <View style={s.logoPlate}>
              <Image
                source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
                style={s.logo}
                contentFit="contain"
              />
            </View>
            <Text style={s.brandName}>M2C MarkDowns</Text>
            <Text style={s.brandSub}>Private Limited</Text>
          </LinearGradient>

          {/* Brand rule — the drawer's echo of the header's accent edge. */}
          <View style={s.brandRule} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          >
            {/* ── Account card ───────────────────────────────────────────────
                The one brand-filled surface in the drawer. It carries no imagery,
                so red is safe here, and it anchors the theme at the point the
                user looks first. */}
            <Animated.View style={staggerStyle(progress, next())}>
              <View style={s.accountWrap}>
                <Pressable
                  onPress={() => go(isAuth ? '/(tabs)/profile' : '/(auth)/Login')}
                  accessibilityRole="button"
                  accessibilityLabel={isAuth ? 'View my account' : 'Sign in'}
                  android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
                  style={({ pressed }) => [s.accountCardShadow, pressed && s.accountCardPressed]}
                >
                  <LinearGradient
                    colors={[Palette.primary, Palette.primaryPressed]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.accountCard}
                  >
                    <View style={s.avatar}>
                      {isAuth && initials ? (
                        <Text style={s.avatarText}>{initials}</Text>
                      ) : (
                        <UserIcon size={20} color={Palette.onBrand} />
                      )}
                    </View>
                    <View style={s.fill}>
                      <Text style={s.accountName} numberOfLines={1}>
                        {isAuth ? userName || 'My Account' : 'Sign In'}
                      </Text>
                      {isAuth && userEmail ? (
                        <Text style={s.accountSub} numberOfLines={1}>{userEmail}</Text>
                      ) : !isAuth ? (
                        <Text style={s.accountSub}>Login to your account</Text>
                      ) : null}
                    </View>
                    {isAuth ? (
                      <ChevronRight size={17} color={Palette.onBrand} />
                    ) : (
                      <LogIn size={17} color={Palette.onBrand} />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </Animated.View>

            {/* ── Shop ─────────────────────────────────────────────────────── */}
            <SectionLabel label="Shop" progress={progress} index={next()} />
            <NavItem progress={progress} index={next()} icon={<Star size={16} color={Palette.ink} />} label="Featured Products" onPress={() => go('/(any)/products?collection=featured')} />
            <NavItem progress={progress} index={next()} icon={<TrendingUp size={16} color={Palette.ink} />} label="Best Sellers" onPress={() => go('/(any)/products?collection=best-seller')} />
            <NavItem progress={progress} index={next()} icon={<Award size={16} color={Palette.ink} />} label="Top Selling" onPress={() => go('/(any)/products?collection=top-selling')} />
            {/* Offers is the one promotional entry, so it gets the brand chip. */}
            <NavItem progress={progress} index={next()} accent icon={<Percent size={16} color={Palette.primary} />} label="Offers" onPress={() => go('/(any)/offers')} />

            {isAuth ? (
              <>
                <Divider />
                <SectionLabel label="My Account" progress={progress} index={next()} />
                <NavItem progress={progress} index={next()} icon={<Package size={16} color={Palette.ink} />} label="My Orders" onPress={() => go('/(tabs)/orders')} />
                <NavItem progress={progress} index={next()} icon={<Heart size={16} color={Palette.ink} />} label="My Wishlist" onPress={() => go('/(tabs)/wishlist')} />
                <NavItem progress={progress} index={next()} icon={<ShoppingCart size={16} color={Palette.ink} />} label="My Cart" onPress={() => go('/(tabs)/cart')} />
                <NavItem progress={progress} index={next()} icon={<LifeBuoy size={16} color={Palette.ink} />} label="Support" onPress={() => go('/(any)/support')} />
              </>
            ) : null}

            <Divider />

            {/* ── Categories ───────────────────────────────────────────────── */}
            <SectionLabel label="Categories" progress={progress} index={next()} />
            {loadingCats ? (
              <View style={s.centerPad}>
                <ActivityIndicator size="small" color={Palette.primary} />
              </View>
            ) : categories.length === 0 ? (
              <View style={s.centerPad}>
                <Text style={s.emptyText}>No categories</Text>
              </View>
            ) : (
              <>
                {categories.map((cat) => (
                  <Animated.View key={cat.id} style={staggerStyle(progress, next())}>
                    <Pressable
                      onPress={() => { onClose(); setTimeout(() => router.push(`/(tabs)/categories/${cat.slug}` as any), 280); }}
                      accessibilityRole="button"
                      accessibilityLabel={cat.name}
                      android_ripple={RIPPLE}
                    >
                      <View style={s.row}>
                        <View style={[s.chip, s.chipImage]}>
                          {cat.image ? (
                            <Image source={{ uri: cat.image }} style={s.fillImage} contentFit="cover" />
                          ) : (
                            <Package size={14} color={Palette.textSubtle} />
                          )}
                        </View>
                        <View style={s.fill}>
                          <Text style={s.rowLabel} numberOfLines={1}>{cat.name}</Text>
                          {cat.subcategoryCount && cat.subcategoryCount > 0 ? (
                            <Text style={s.rowSub}>{cat.subcategoryCount} subcategories</Text>
                          ) : null}
                        </View>
                        <ChevronRight size={14} color={Palette.outlineVariant} />
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}

                {/* Primary CTA of the drawer — brand filled. */}
                <Animated.View style={[staggerStyle(progress, next()), s.ctaWrap]}>
                  <Pressable
                    onPress={() => go('/(tabs)/categories')}
                    accessibilityRole="button"
                    accessibilityLabel="View all categories"
                    android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
                    style={({ pressed }) => [s.ctaShadow, pressed && s.ctaPressed]}
                  >
                    <LinearGradient
                      colors={[Palette.primary, Palette.primaryPressed]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.cta}
                    >
                      <Text style={s.ctaText}>View All Categories</Text>
                      <ChevronRight size={16} color={Palette.onPrimary} />
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ── Animation helper ─────────────────────────────────────────────────────── */

type AnimStyle = {
  opacity: Animated.AnimatedInterpolation<string | number>;
  transform: { translateX: Animated.AnimatedInterpolation<number> }[];
};

/** Each row fades + slides in a beat after the one above it. */
// how many "slots" fit before the window would exceed progress's 0–1 range
const MAX_STAGGER_INDEX = Math.floor((1 - STAGGER_SPAN) / STAGGER_STEP); // = 13

function staggerStyle(progress: Animated.Value, index: number): AnimStyle {
  const cappedIndex = Math.min(index, MAX_STAGGER_INDEX);
  const from = cappedIndex * STAGGER_STEP;
  const to = from + STAGGER_SPAN;
  return {
    opacity: progress.interpolate({
      inputRange: [from, to],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [from, to],
          outputRange: [28, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function Divider() {
  return <View style={s.divider} />;
}

function SectionLabel({ label, progress, index }: { label: string; progress: Animated.Value; index: number }) {
  return (
    <Animated.View style={staggerStyle(progress, index)}>
      <View style={s.sectionLabelRow}>
        <View style={s.sectionTick} />
        <Text style={s.sectionLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

function NavItem({
  icon,
  label,
  onPress,
  accent,
  progress,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  /** Tints the icon chip with the brand container — for promotional entries. */
  accent?: boolean;
  progress: Animated.Value;
  index: number;
}) {
  return (
    <Animated.View style={staggerStyle(progress, index)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={RIPPLE}
      >
        <View style={s.row}>
          <View style={[s.chip, accent && s.chipAccent]}>{icon}</View>
          <Text style={[s.rowLabel, s.fill, accent && s.rowLabelAccent]}>{label}</Text>
          <ChevronRight size={14} color={Palette.outlineVariant} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  fill: { flex: 1 },
  fillImage: { width: '100%', height: '100%' },

  scrim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.45)',
  },

  panel: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Palette.surface,
    borderTopRightRadius: PANEL_RADIUS,
    borderBottomRightRadius: PANEL_RADIUS,
    ...Shadow.modal,
  },
  panelClip: {
    flex: 1,
    borderTopRightRadius: PANEL_RADIUS,
    borderBottomRightRadius: PANEL_RADIUS,
    overflow: 'hidden',
    backgroundColor: Palette.surface,
  },

  // Brand
  brandBlock: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  closeHit: { position: 'absolute', top: 0, right: 10, zIndex: 10, padding: 6 },
  closeChip: {
    width: 32, height: 32,
    borderRadius: Radius.md,
    // Glass chip on the dark panel — lighter than a solid fill.
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoPlate: {
    backgroundColor: Palette.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 10,
    ...Shadow.cardHover,
  },
  logo: { width: 180, height: 64 },
  brandName: { fontSize: 16, fontWeight: '700', color: Palette.onInverse },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.62)', marginTop: 1 },
  brandRule: { height: 3, backgroundColor: Palette.primary },

  // Account card
  accountWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  accountCardShadow: {
    borderRadius: Radius.lg,
    ...Shadow.cardHover,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: 14,
  },
  accountCardPressed: { opacity: 0.88 },
  avatar: {
    width: 44, height: 44,
    borderRadius: Radius.lg,
    // Translucent white rather than a solid fill: it lets the red read through,
    // so the avatar sits *in* the card instead of on top of it.
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Palette.onBrand, fontSize: 16, fontWeight: '800' },
  accountName: { fontSize: 14.5, fontWeight: '700', color: Palette.onBrand },
  accountSub: { fontSize: 11.5, color: Palette.onBrand, marginTop: 2 },

  // Rows
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTick: { width: 3, height: 12, borderRadius: Radius.full, backgroundColor: Palette.primary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chip: {
    width: 34, height: 34,
    borderRadius: Radius.md,
    backgroundColor: Palette.outlineSubtle,
    borderWidth: 1,
    borderColor: Palette.outline,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  chipAccent: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.brandBorder,
  },
  chipImage: { overflow: 'hidden' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: Palette.ink },
  rowLabelAccent: { color: Palette.primary },
  rowSub: { fontSize: 11, color: Palette.textSubtle, marginTop: 1 },

  divider: {
    height: 1,
    backgroundColor: Palette.outlineSubtle,
    marginHorizontal: 16,
    marginVertical: 10,
  },

  centerPad: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { fontSize: 12, color: Palette.textSubtle },

  // CTA
  ctaWrap: { paddingHorizontal: 16, marginTop: 12 },
  ctaShadow: {
    borderRadius: Radius.md,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: { fontSize: 14, fontWeight: '700', color: Palette.onPrimary },
});
