import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import {
  X,
  Star,
  TrendingUp,
  Award,
  ChevronRight,
  Package,
  User as UserIcon,
  Mail,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { categoryService, type Category } from '@/services/categoryService';
import { userAuthService } from '@/services/userAuthService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.7;

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [userName, setUserName] = useState<string>('Guest User');
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  // Fetch user data on each open
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await userAuthService.getUserData();
        if (userData) {
          setUserName(userData.name || 'Guest User');
          setUserEmail(userData.email || '');
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    loadUserData();
  }, [visible]);

  // Fetch categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          sortBy: 'sortOrder',
          sortOrder: 'asc',
        });
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Drive Modal visibility and animation together
  useEffect(() => {
    if (visible) {
      // Mount the Modal first, then animate in
      setModalVisible(true);
      translateX.setValue(-SIDEBAR_WIDTH);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then unmount the Modal
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleNavigation = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 300);
  };

  const handleCategoryPress = (category: Category) => {
    onClose();
    setTimeout(() => router.push(`/(tabs)/categories/${category.slug}` as any), 300);
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 50;
  const closeBtnTop = Platform.OS === 'android' ? statusBarHeight + 12 : 56;

  return (
    // Using Modal ensures the sidebar renders in its own native layer,
    // completely outside any parent ScrollView — this is the definitive fix
    // for scroll events bleeding through to the home screen.
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      {/* ── Overlay ──────────────────────────────────────── */}
      <Animated.View
        className="absolute inset-0 bg-black/50"
        style={{ opacity: overlayOpacity }}
      >
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* ── Sidebar Panel ────────────────────────────────── */}
      <Animated.View
        className="absolute top-0 left-0 bottom-0 bg-black"
        style={{
          width: SIDEBAR_WIDTH,
          paddingTop: statusBarHeight,
          transform: [{ translateX }],
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {/* Close Button */}
        {/* <TouchableOpacity
          onPress={onClose}
          className="absolute right-3 z-10 p-1.5 rounded-full bg-white/10"
          style={{ top: closeBtnTop }}
          activeOpacity={0.7}
        >
          <X size={20} color="#9ca3af" />
        </TouchableOpacity> */}

        {/* ── Sidebar ScrollView: isolated inside Modal, never touches outer app ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* ══════════════════════════════════════════════
              Company Logo & Branding
          ══════════════════════════════════════════════ */}
          <View className="items-center py-6 px-4">
            <View
              className="rounded-md bg-white/5 items-center justify-center mb-3 border-[1.5px] border-white/10"
              style={{ width: 140, height: 105, borderRadius: 10, padding: 10 }}
            >
              <View
                className="bg-white items-center justify-center"
                style={{ width: 132, height: 96, borderRadius: 10 }}
              >
                <Image
                  source={require('../../../../assets/images/logo4.png')}
                  className="rounded-md"
                  style={{ width: 132, height: 96, borderRadius: 10 }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text className="text-lg font-bold text-white tracking-wide">
              M2C MarkDowns
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Private Limited
            </Text>
          </View>

          {/* ══════════════════════════════════════════════
              User Info Card
          ══════════════════════════════════════════════ */}
          <View className="px-4 pb-4">
            <TouchableOpacity
              onPress={() => handleNavigation('/(tabs)/profile')}
              className="flex-row items-center bg-white/5 rounded-xl p-3.5 border border-white/5"
              activeOpacity={0.7}
            >
              <View className="w-11 h-11 rounded-full bg-white/10 items-center justify-center mr-3">
                <UserIcon size={22} color="#ffffff" />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                  {userName}
                </Text>
                {userEmail ? (
                  <View className="flex-row items-center mt-0.5">
                    <Mail size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400 ml-1" numberOfLines={1}>
                      {userEmail}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-white font-bold mt-0.5 tracking-wide">
                    Tap to sign in
                  </Text>
                )}
              </View>

              <ChevronRight size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* ══════ Divider ══════ */}
          <View className="h-px bg-white/10 mx-4" />

          {/* ══════════════════════════════════════════════
              Product Navigation Links
          ══════════════════════════════════════════════ */}
          <View className="py-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">
              Browse Products
            </Text>

            <TouchableOpacity
              onPress={() => handleNavigation('/(any)/browse-products?type=featured')}
              className="flex-row items-center py-3 px-4"
              activeOpacity={0.6}
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-3 bg-white/10"
              >
                <Star size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-sm font-medium text-gray-300">
                Featured Products
              </Text>
              <ChevronRight size={16} color="#4b5563" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNavigation('/(any)/browse-products?type=bestseller')}
              className="flex-row items-center py-3 px-4"
              activeOpacity={0.6}
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-3 bg-white/10"
              >
                <TrendingUp size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-sm font-medium text-gray-300">
                Bestselling Products
              </Text>
              <ChevronRight size={16} color="#4b5563" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNavigation('/(any)/browse-products?type=topselling')}
              className="flex-row items-center py-3 px-4"
              activeOpacity={0.6}
            >
              <View
                className="w-9 h-9 rounded-xl items-center justify-center mr-3 bg-white/10"
              >
                <Award size={18} color="#ffffff" />
              </View>
              <Text className="flex-1 text-sm font-medium text-gray-300">
                Top Selling Products
              </Text>
              <ChevronRight size={16} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* ══════ Divider ══════ */}
          <View className="h-px bg-white/10 mx-4" />

          {/* ══════════════════════════════════════════════
              Categories List
          ══════════════════════════════════════════════ */}
          <View className="py-3">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">
              Category
            </Text>

            {loadingCategories ? (
              <View className="items-center py-5">
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-xs text-gray-500 mt-2">
                  Loading categories...
                </Text>
              </View>
            ) : categories.length === 0 ? (
              <View className="items-center py-5 px-4">
                <Package size={28} color="#4b5563" />
                <Text className="text-xs text-gray-500 mt-2">
                  No categories available
                </Text>
              </View>
            ) : (
              categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => handleCategoryPress(category)}
                  className="flex-row items-center py-2.5 px-4"
                  activeOpacity={0.6}
                >
                  <View className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center mr-3 overflow-hidden">
                    {category.image ? (
                      <Image
                        source={{ uri: category.image }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Package size={18} color="#9ca3af" />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-300" numberOfLines={1}>
                      {category.name}
                    </Text>
                    {category.subcategoryCount !== undefined &&
                      category.subcategoryCount > 0 && (
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {category.subcategoryCount} subcategories
                        </Text>
                      )}
                  </View>

                  <ChevronRight size={16} color="#4b5563" />
                </TouchableOpacity>
              ))
            )}

            {categories.length > 0 && (
              <TouchableOpacity
                onPress={() => handleNavigation('/(tabs)/categories')}
                className="mx-4 mt-3 py-3 rounded-xl border border-white/20 items-center bg-white/5"
                activeOpacity={0.7}
              >
                <Text className="text-sm font-bold text-white tracking-wide">
                  View All Categories
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
