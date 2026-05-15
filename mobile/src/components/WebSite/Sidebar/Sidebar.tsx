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
} from 'react-native';
import { Image } from 'expo-image';
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
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { userAuthService } from '@/services/userAuthService';
import { companyInfoService } from '@/services/companyInfoService';

const STATIC_LOGO = require('../../../../assets/images/logo4.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 340);

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const router = useRouter();

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
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
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

  return (
    <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Overlay */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: overlayOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          backgroundColor: '#ffffff',
          paddingTop: statusBarH,
          transform: [{ translateX }],
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Close button */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          hitSlop={8}
          style={{ position: 'absolute', top: statusBarH + 12, right: 12, zIndex: 10, padding: 6 }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#111827" />
          </View>
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Brand */}
          <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 }}>
            <View style={{ marginBottom: 8 }}>
              <Image
                source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
                style={{ width: 240, height: 110 }}
                contentFit="contain"
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>M2C MarkDowns</Text>
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>Private Limited</Text>
          </View>

          {/* User card */}
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Pressable
              onPress={() => go(isAuth ? '/(tabs)/profile' : '/(auth)/Login')}
              accessibilityRole="button"
              android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f9fafb',
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: isAuth ? '#111827' : '#e5e7eb',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  {isAuth && initials ? (
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{initials}</Text>
                  ) : (
                    <UserIcon size={20} color={isAuth ? '#fff' : '#9ca3af'} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                    {isAuth ? userName || 'My Account' : 'Sign In'}
                  </Text>
                  {isAuth && userEmail ? (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }} numberOfLines={1}>{userEmail}</Text>
                  ) : !isAuth ? (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Login to your account</Text>
                  ) : null}
                </View>
                {isAuth ? (
                  <ChevronRight size={16} color="#9ca3af" />
                ) : (
                  <LogIn size={16} color="#111827" />
                )}
              </View>
            </Pressable>
          </View>

          <Divider />

          {/* Browse Products */}
          <SectionLabel label="Shop" />
          <NavItem icon={<Star size={16} color="#111827" />} label="Featured Products" onPress={() => go('/(any)/products')} />
          <NavItem icon={<TrendingUp size={16} color="#111827" />} label="Best Sellers" onPress={() => go('/(any)/products')} />
          <NavItem icon={<Award size={16} color="#111827" />} label="Top Selling" onPress={() => go('/(any)/products')} />

          {isAuth ? (
            <>
              <Divider />
              <SectionLabel label="My Account" />
              <NavItem icon={<Package size={16} color="#111827" />} label="My Orders" onPress={() => go('/(tabs)/orders')} />
              <NavItem icon={<Heart size={16} color="#111827" />} label="My Wishlist" onPress={() => go('/(tabs)/wishlist')} />
              <NavItem icon={<ShoppingCart size={16} color="#111827" />} label="My Cart" onPress={() => go('/(tabs)/cart')} />
            </>
          ) : null}

          <Divider />

          {/* Categories */}
          <SectionLabel label="Categories" />
          {loadingCats ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <ActivityIndicator size="small" color="#111827" />
            </View>
          ) : categories.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>No categories</Text>
            </View>
          ) : (
            <>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => { onClose(); setTimeout(() => router.push(`/(tabs)/categories/${cat.slug}` as any), 280); }}
                  accessibilityRole="button"
                  android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      {cat.image ? (
                        <Image source={{ uri: cat.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      ) : (
                        <Package size={14} color="#9ca3af" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }} numberOfLines={1}>{cat.name}</Text>
                      {cat.subcategoryCount && cat.subcategoryCount > 0 ? (
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{cat.subcategoryCount} subcategories</Text>
                      ) : null}
                    </View>
                    <ChevronRight size={14} color="#d1d5db" />
                  </View>
                </Pressable>
              ))}

              <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                <Pressable onPress={() => go('/(tabs)/categories')} accessibilityRole="button">
                  <View
                    style={{
                      height: 40,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>View All Categories</Text>
                  </View>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16, marginVertical: 8 }} />;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 4, marginBottom: 4 }}>
      {label}
    </Text>
  );
}

function NavItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} android_ripple={{ color: 'rgba(0,0,0,0.04)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {icon}
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
        <ChevronRight size={14} color="#d1d5db" />
      </View>
    </Pressable>
  );
}
