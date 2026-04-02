import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, AppState } from 'react-native';
import { Search, User, ShoppingCart, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import Sidebar from '../Sidebar/Sidebar';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const router = useRouter();

  // ── Load cart item count (same logic as web — authenticated only) ──────────
  const loadCartCount = useCallback(async () => {
    try {
      const authenticated = await userAuthService.isAuthenticated();
      if (!authenticated) {
        setCartCount(0);
        return;
      }
      const response = await cartService.getCart();
      if (response.success && response.data) {
        // Use itemCount from backend (same as web Header)
        const count = response.data.itemCount ?? response.data.items.length;
        setCartCount(count);
      }
    } catch {
      // Silently fail — badge just won't show
    }
  }, []);

  useEffect(() => {
    // Load immediately on mount
    loadCartCount();

    // Poll every 5 seconds — same interval as web
    const interval = setInterval(loadCartCount, 5000);

    // Also refresh when app comes back to foreground
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadCartCount();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [loadCartCount]);

  // ── Search handlers ────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/(any)/search?q=${encodeURIComponent(searchQuery.trim())}` as any);
    } else {
      router.push('/(any)/search' as any);
    }
  };

  const handleSubmitEditing = () => {
    router.push(`/(any)/search?q=${encodeURIComponent(searchQuery.trim())}` as any);
  };

  // ── Badge label (99+ cap — same as web) ──────────────────────────────────
  const badgeLabel = cartCount > 99 ? '99+' : String(cartCount);

  return (
    <>
      <View className="bg-black">
        {/* Row 1 — Menu · Brand · Profile · Cart */}
        <View className="px-4 py-3 flex-row items-center justify-between">
          {/* Hamburger */}
          <TouchableOpacity
            onPress={() => setSidebarVisible(true)}
            className="p-2"
            activeOpacity={0.7}
          >
            <Menu size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Brand name */}
          <View className="flex-1 mx-3">
            <Text className="text-base font-bold text-white">
              M2C MarkDowns
            </Text>
            <Text className="text-xs text-gray-500">
              Private Limited
            </Text>
          </View>

          {/* Profile */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile' as any)}
            className="p-2"
            activeOpacity={0.7}
          >
            <User size={24} color="#ffffff" />
          </TouchableOpacity>

          {/* Cart with badge */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/cart' as any)}
            className="p-2 ml-2"
            activeOpacity={0.7}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={24} color="#ffffff" />

            {/* Badge — only shown when count > 0, matching web */}
            {cartCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#ffffff', // Pure white, matches monochrome theme
                  borderRadius: 99,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Thin black ring to separate badge from icon
                  borderWidth: 1.5,
                  borderColor: '#000000', // pure black
                }}
              >
                <Text
                  style={{
                    color: '#000000',
                    fontSize: 10,
                    fontWeight: '800',
                    lineHeight: 13,
                  }}
                  numberOfLines={1}
                >
                  {badgeLabel}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Row 2 — Search bar */}
        <View className="px-4 pb-3">
          <View className="flex-row items-center bg-gray-100 rounded-xl overflow-hidden border border-gray-300">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              placeholderTextColor="#6b7280"
              className="flex-1 px-4 py-3 text-gray-900 font-medium"
              onSubmitEditing={handleSubmitEditing}
              onFocus={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={handleSearch}
              className="bg-black px-4 py-3"
              activeOpacity={0.8}
            >
              <Search size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sidebar — Modal layer, fully isolated from ScrollView */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </>
  );
}

export default Header;
