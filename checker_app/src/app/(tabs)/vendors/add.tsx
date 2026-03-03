import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { QualityInspectionForm } from '@/components/Form/QualityInspectionForm';

export default function AddInspectionScreen() {
  const { vendorId, vendorName } = useLocalSearchParams<{ 
    vendorId: string; 
    vendorName?: string; 
  }>();
  const [loading, setLoading] = useState(true);
  const [finalVendorName, setFinalVendorName] = useState<string>('');

  useEffect(() => {
    if (vendorName) {
      setFinalVendorName(decodeURIComponent(vendorName));
    } else if (vendorId) {
      // Fallback: derive vendor name from ID or fetch from storage/API
      const vendorNames: { [key: string]: string } = {
        'VEN-001': 'Alpha Textiles Ltd',
        'VEN-002': 'Bright Garments',
        'VEN-003': 'Quality Fashions',
        'SCH-001': 'Alpha Textiles Ltd',
        'SCH-002': 'Bright Garments',
        'SCH-003': 'Quality Fashions'
      };
      setFinalVendorName(vendorNames[vendorId] || 'Unknown Vendor');
    }
    setLoading(false);
  }, [vendorId, vendorName]);

  const handleComplete = () => {
    // Navigate back to vendors list or dashboard
    router.push('/(tabs)/vendors');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!vendorId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Invalid vendor information</Text>
      </View>
    );
  }

  return (
    <QualityInspectionForm
      vendorName={finalVendorName}
      onComplete={handleComplete}
    />
  );
}