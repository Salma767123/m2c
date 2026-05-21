import React from 'react';
import { View, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViewReport } from '@/components/Report/ViewReport';

export default function FactoryReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ViewReport
        reportId={id || ''}
        onBack={() => router.back()}
      />
    </View>
  );
}
