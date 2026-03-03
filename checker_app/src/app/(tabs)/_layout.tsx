import { Stack, usePathname } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import Header from "@/components/General/Header";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const allTabs = [
    { name: "index", label: "Home", icon: LayoutDashboard, title: "Dashboard" },
    { name: "vendors", label: "Vendors", icon: Users, title: "Vendors" },
    { name: "report", label: "Reports", icon: FileText, title: "Reports" },
    { name: "settings", label: "Settings", icon: SettingsIcon, title: "Settings" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Header />
      
      {/* Stack Navigator */}
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { 
            paddingBottom: 60,
          },
          animation: "none"
        }}
      >
        {allTabs.map(tab => (
          <Stack.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
            }}
          />
        ))}
      </Stack>

      {/* Custom Bottom Navigation */}
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
    </SafeAreaView>
  );
}
