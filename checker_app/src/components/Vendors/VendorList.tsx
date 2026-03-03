import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, Factory, MapPin, Calendar, ArrowRight, Eye } from 'lucide-react-native';
import { MobileVendor, VendorDetail } from './VendorDetail';
import { QualityInspectionForm } from './QualityInspectionForm';

const VENDORS: MobileVendor[] = [
  {
    id: 'V-001',
    name: 'Alpha Textiles Ltd',
    location: 'Bangalore, IN',
    category: 'Woven Garments',
    openPos: 3,
    status: 'active',
  },
  {
    id: 'V-002',
    name: 'Bright Garments',
    location: 'Tiruppur, IN',
    category: 'Knitwear',
    openPos: 2,
    status: 'pending',
  },
  {
    id: 'V-003',
    name: 'Quality Fashions',
    location: 'Mumbai, IN',
    category: 'Denim',
    openPos: 4,
    status: 'review',
  },
  {
    id: 'V-004',
    name: 'Modern Apparel Co',
    location: 'Chennai, IN',
    category: 'Sportswear',
    openPos: 1,
    status: 'active',
  },
];

export function VendorList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showVendorDetail, setShowVendorDetail] = useState(false);
  const [inProgressInspection, setInProgressInspection] = useState(false);

  const selectedVendor = useMemo(
    () => VENDORS.find((v) => v.id === selectedVendorId) ?? null,
    [selectedVendorId],
  );

  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return VENDORS;
    return VENDORS.filter((v) => {
      return (
        v.name.toLowerCase().includes(query) ||
        v.location.toLowerCase().includes(query) ||
        v.category.toLowerCase().includes(query)
      );
    });
  }, [searchTerm]);

  const getStatusClasses = (status: MobileVendor['status']) => {
    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (status === 'pending') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const handleViewDetails = (vendor: MobileVendor) => {
    setSelectedVendorId(vendor.id);
    setShowVendorDetail(true);
    setInProgressInspection(false);
  };

  const handleStartInspection = (vendor: MobileVendor) => {
    setSelectedVendorId(vendor.id);
    setInProgressInspection(true);
    setShowVendorDetail(false);
  };

  const handleBackToList = () => {
    setShowVendorDetail(false);
    setInProgressInspection(false);
    setSelectedVendorId(null);
  };

  const handleCompleteInspection = () => {
    setInProgressInspection(false);
    setShowVendorDetail(false);
    setSelectedVendorId(null);
  };

  if (inProgressInspection && selectedVendor) {
    return (
      <QualityInspectionForm
        vendorName={selectedVendor.name}
        onComplete={handleCompleteInspection}
      />
    );
  }

  if (showVendorDetail && selectedVendor) {
    return (
      <VendorDetail
        vendor={selectedVendor}
        onBack={handleBackToList}
        onStartInspection={handleStartInspection}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      <View className="mb-4">
        <Text className="text-2xl font-bold text-black mb-1">Vendor Management</Text>
        <Text className="text-sm text-neutral-600">
          Select a vendor to start a Quality Inspection.
        </Text>
      </View>

      <View className="mb-4 flex-row items-center rounded-full border border-neutral-300 bg-white px-3">
        <Search size={16} color="#6b7280" />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search vendors by name or location..."
          className="ml-2 flex-1 py-2 text-sm text-black"
        />
      </View>

      {filteredVendors.map((vendor) => (
        <View
          key={vendor.id}
          className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 rounded-xl bg-blue-100 p-3">
                <Factory size={20} color="#1d4ed8" />
              </View>
              <View>
                <Text className="text-sm font-bold text-black">{vendor.name}</Text>
                <View className="mt-1 flex-row items-center">
                  <MapPin size={12} color="#4b5563" />
                  <Text className="ml-1 text-xs text-neutral-600">{vendor.location}</Text>
                </View>
              </View>
            </View>
            <View
              className={`rounded-full border px-2 py-1 ${
                getStatusClasses(vendor.status)
              }`}
            >
              <Text className="text-[10px] font-semibold">
                {vendor.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-neutral-700">
              Category: <Text className="font-semibold">{vendor.category}</Text>
            </Text>
            <Text className="text-xs text-neutral-700">
              Open POs: <Text className="font-semibold">{vendor.openPos}</Text>
            </Text>
          </View>

          <View className="mb-3 flex-row items-center">
            <Calendar size={12} color="#4b5563" />
            <Text className="ml-1 text-xs text-neutral-600">
              Last updated: Recently
            </Text>
          </View>

          <View className="flex-row">
            <TouchableOpacity
              onPress={() => handleViewDetails(vendor)}
              className="mr-2 flex-1 flex-row items-center justify-center rounded-lg bg-neutral-100 px-3 py-2"
            >
              <Eye size={14} color="#111827" />
              <Text className="ml-1 text-xs font-semibold text-neutral-800">
                Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleStartInspection(vendor)}
              className="flex-1 flex-row items-center justify-center rounded-lg bg-black px-3 py-2"
            >
              <Text className="mr-1 text-xs font-semibold text-white">
                Start
              </Text>
              <ArrowRight size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {filteredVendors.length === 0 && (
        <View className="mt-10 items-center">
          <Factory size={32} color="#9ca3af" />
          <Text className="mt-2 text-sm text-neutral-500">
            No vendors match your search.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

