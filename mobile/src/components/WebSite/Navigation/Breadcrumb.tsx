import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, Home } from 'lucide-react-native';
import { router } from 'expo-router';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const handleNavigation = (href: string) => {
    router.push(href as any);
  };

  return (
    <View className="bg-white border-b border-gray-100">
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4 py-3"
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => handleNavigation('/')}
            className="flex-row items-center"
          >
            <Home size={16} color="#6b7280" />
          </TouchableOpacity>
          
          {items.map((item, index) => (
            <View key={index} className="flex-row items-center">
              <ChevronRight size={14} color="#9ca3af" className="mx-2" />
              {item.href ? (
                <TouchableOpacity onPress={() => handleNavigation(item.href!)}>
                  <Text className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-sm font-bold text-gray-900">
                  {item.label}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}