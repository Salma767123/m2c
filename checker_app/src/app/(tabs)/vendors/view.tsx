import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { VendorDetail, MobileVendor } from '@/components/Vendors/VendorDetail';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock data for both vendors and scheduled inspections
const MOCK_VENDORS: MobileVendor[] = [
  {
    id: 'VEN-001',
    name: 'Alpha Textiles Ltd',
    location: 'Bangalore, IN',
    category: 'Cotton Textiles',
    openPos: 4,
    status: 'active',
    recentPO: 'PO-2024-001',
    performance: {
      totalInspections: 45,
      passRate: 92,
      averageScore: 8.5,
      onTimeDelivery: 88
    },
    contactPerson: {
      name: 'John Smith',
      designation: 'Quality Manager',
      phone: '+91 98765 43210',
      email: 'john.smith@alphatextiles.com'
    },
    factory: {
      name: 'Alpha Textiles Main Unit',
      address: 'Industrial Area, Bangalore, Karnataka 560001',
      workingHours: '8:00 AM - 6:00 PM'
    }
  },
  {
    id: 'VEN-002',
    name: 'Bright Garments',
    location: 'Tiruppur, IN',
    category: 'Garments',
    openPos: 3,
    status: 'active',
    recentPO: 'PO-2024-002',
    performance: {
      totalInspections: 32,
      passRate: 87,
      averageScore: 8.2,
      onTimeDelivery: 85
    },
    contactPerson: {
      name: 'Sarah Johnson',
      designation: 'Production Manager',
      phone: '+91 98765 43211',
      email: 'sarah.johnson@brightgarments.com'
    },
    factory: {
      name: 'Bright Garments Factory',
      address: 'Export Zone, Tiruppur, Tamil Nadu 641601',
      workingHours: '7:00 AM - 7:00 PM'
    }
  },
  {
    id: 'VEN-003',
    name: 'Quality Fashions',
    location: 'Mumbai, IN',
    category: 'Fashion',
    openPos: 2,
    status: 'active',
    recentPO: 'PO-2024-003',
    performance: {
      totalInspections: 28,
      passRate: 95,
      averageScore: 9.1,
      onTimeDelivery: 92
    },
    contactPerson: {
      name: 'Raj Patel',
      designation: 'Quality Head',
      phone: '+91 98765 43212',
      email: 'raj.patel@qualityfashions.com'
    },
    factory: {
      name: 'Quality Fashions Manufacturing',
      address: 'Andheri Industrial Estate, Mumbai, Maharashtra 400053',
      workingHours: '9:00 AM - 6:00 PM'
    }
  }
];

// Mapping for scheduled inspections to vendors
const INSPECTION_TO_VENDOR_MAP: { [key: string]: string } = {
  'SCH-001': 'VEN-001',
  'SCH-002': 'VEN-002',
  'SCH-003': 'VEN-003'
};

export default function VendorViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vendor, setVendor] = useState<MobileVendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVendor = async () => {
      if (id) {
        let foundVendor: MobileVendor | undefined;
        
        // Check if it's a scheduled inspection ID
        if (id.startsWith('SCH-')) {
          const vendorId = INSPECTION_TO_VENDOR_MAP[id];
          if (vendorId) {
            foundVendor = MOCK_VENDORS.find(v => v.id === vendorId);
            
            // Try to get inspection details from AsyncStorage
            try {
              const inspectionData = await AsyncStorage.getItem('selectedInspection');
              if (inspectionData && foundVendor) {
                const inspection = JSON.parse(inspectionData);
                // Update vendor with inspection-specific data
                foundVendor = {
                  ...foundVendor,
                  recentPO: inspection.po,
                  name: inspection.vendor,
                  location: inspection.location
                };
              }
            } catch (error) {
              console.error('Error loading inspection data:', error);
            }
          }
        } else {
          // Direct vendor ID
          foundVendor = MOCK_VENDORS.find(v => v.id === id);
        }
        
        setVendor(foundVendor || null);
      }
      setLoading(false);
    };

    loadVendor();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  const handleStartInspection = (vendor: MobileVendor) => {
    router.push(`/(tabs)/vendors/add?vendorId=${id}&vendorName=${encodeURIComponent(vendor.name)}`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Vendor not found</Text>
      </View>
    );
  }

  return (
    <VendorDetail
      vendor={vendor}
      onBack={handleBack}
      onStartInspection={handleStartInspection}
    />
  );
}