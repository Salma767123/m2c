import { Stack, usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  LayoutDashboard,
  Users,
  FileText,
  Box,
} from 'lucide-react-native';
import Header from "@/components/General/Header";
import { AppText } from "@/components/UI/AppText";
import { brand, colors, radius, space, elevation } from "@/constants/design";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const allTabs = [
    { name: "index", label: "Home", icon: LayoutDashboard },
    { name: "vendors", label: "Vendors", icon: Users },
    { name: "products", label: "Products", icon: Box },
    { name: "report", label: "Reports", icon: FileText },
  ];

  const hideChrome = pathname.includes('product-inspection');
  // Actual bottom-nav height so screens reserve exactly the right space
  // (no dead gap, nothing hidden) on every device.
  const navHeight = space.sm + 48 + (insets.bottom || space.sm);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Status-bar area painted brand-red so the AppBar reads as one surface */}
      <StatusBar style="light" backgroundColor={brand[500]} />
      <View style={{ height: insets.top, backgroundColor: brand[500] }} />

      {/* Header (AppBar) */}
      <Header />

      {/* Content stack — reserve exactly the bottom-nav height on normal screens */}
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.canvas,
            paddingBottom: hideChrome ? 0 : navHeight,
          },
          animation: "none",
        }}
      />

      {/* Bottom navigation — white bar with a brand-red active pill */}
      {!keyboardVisible && !hideChrome && (
        <View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom || space.sm,
              paddingTop: space.sm,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
            },
            elevation.dropdown,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm }}>
            {allTabs.map((tab) => {
              const isActive = tab.name === 'index'
                ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/'
                : pathname.includes(`/${tab.name}`);
              const Icon = tab.icon;

              return (
                <TouchableOpacity
                  key={tab.name}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    try {
                      const routePath = tab.name === 'index' ? '/(tabs)/' : `/(tabs)/${tab.name}`;
                      router.replace(routePath as any);
                    } catch {
                      router.push('/(tabs)/' as any);
                    }
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 48,
                    marginHorizontal: 4,
                    paddingVertical: 6,
                    borderRadius: radius.lg,
                    backgroundColor: isActive ? brand[50] : 'transparent',
                  }}
                >
                  <Icon
                    color={isActive ? brand[500] : colors.textMuted}
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <AppText
                    variant="labelSm"
                    color={isActive ? brand[600] : colors.textMuted}
                    style={{ marginTop: 2, fontSize: 10, letterSpacing: 0.2 }}
                  >
                    {tab.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
