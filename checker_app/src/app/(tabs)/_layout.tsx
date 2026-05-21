import { Stack, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Box,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import Header from "@/components/General/Header";

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
    { name: "report", label: "Reports", icon: FileText }
];

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Header />
      
      {/* Stack Navigator — reserves 60px for the tab bar on regular tab
          screens, but drops it on form sub-screens (where the tab bar is
          hidden) so the form's bottom nav sits flush against the safe
          area instead of floating above 60px of empty space. */}
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            paddingBottom: pathname.includes('product-inspection') ? 0 : 60,
          },
          animation: "none"
        }}
      />

      {/* Custom Bottom Navigation — hidden when keyboard is open,
          AND hidden on inspection-form sub-screens so the form's own
          Previous/Next/Submit buttons aren't covered. */}
      {!keyboardVisible && !pathname.includes('product-inspection') && (
      <View
        className="absolute left-0 right-0 bg-white border-t border-gray-200 shadow-2xl"
        style={{
          bottom: 0,
          paddingBottom: insets.bottom,
        }}
      >
        <View className="flex-row items-center justify-around px-2 py-2">
          {allTabs.map((tab) => {
            const isActive = tab.name === 'index' 
              ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/'
              : pathname.includes(`/${tab.name}`);
            
            return (
              <TouchableOpacity
                key={tab.name}
                activeOpacity={0.7}
                className={`flex-1 items-center justify-center py-2 mx-1 rounded-2xl ${
                  isActive ? 'bg-black' : 'bg-transparent'
                }`}
                onPress={() => {
                  try {
                    const routePath = tab.name === 'index' ? '/(tabs)/' : `/(tabs)/${tab.name}`;
                    router.replace(routePath as any);
                  } catch (error) {
                    router.push('/(tabs)/' as any);
                  }
                }}
              >
                <View className="items-center">
                  <tab.icon 
                    color={isActive ? '#ffffff' : '#6b7280'} 
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <Text 
                    className={`text-[10px] ${
                      isActive ? 'text-white font-bold' : 'text-gray-500 font-medium'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      )}
    </View>
  );
}
