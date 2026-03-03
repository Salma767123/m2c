import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CheckerDashboard } from '@/components/Dashboard/CheckerDashboard';

export default function DashboardScreen() {
  const [checkerId, setCheckerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCheckerId = async () => {
      try {
        const stored = await AsyncStorage.getItem('checkerID');
        if (!stored) {
          router.replace('/Login');
          return;
        }
        setCheckerId(stored);
      } finally {
        setLoading(false);
      }
    };

    loadCheckerId();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <CheckerDashboard checkerId={checkerId} />
    </View>
  );
}
