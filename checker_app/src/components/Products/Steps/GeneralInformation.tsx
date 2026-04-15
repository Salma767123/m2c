import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, CheckCircle } from 'lucide-react-native';

interface GeneralInformationProps {
  formData: {
    client: string;
    vendor: string;
    factory: string;
    serviceLocation: string;
    serviceStartDate: string;
    serviceType: string;
  };
  setFormData: (data: any) => void;
}

const SERVICE_TYPES = [
  'Pre-Shipment Inspection',
  'During Production Inspection',
  'Pre-Production Inspection',
  'Container Loading Supervision',
  'Factory Audit',
  'Product Testing',
];

export default function GeneralInformation({ formData, setFormData }: GeneralInformationProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">General Information</Text>
        <Text className="text-sm text-gray-500">Provide basic details about the inspection service</Text>
      </View>

      {/* Client */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Client</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.client}
          onChangeText={(val) => setFormData({ ...formData, client: val })}
          placeholder="Client name"
        />
      </View>

      {/* Vendor */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Vendor</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.vendor}
          onChangeText={(val) => setFormData({ ...formData, vendor: val })}
          placeholder="Vendor name"
        />
      </View>

      {/* Factory */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Factory</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.factory}
          onChangeText={(val) => setFormData({ ...formData, factory: val })}
          placeholder="Factory name"
        />
      </View>

      {/* Service Location */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Service Location</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.serviceLocation}
          onChangeText={(val) => setFormData({ ...formData, serviceLocation: val })}
          placeholder="Service location"
        />
      </View>

      {/* Service Start Date */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Service Start Date</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.serviceStartDate}
          onChangeText={(val) => setFormData({ ...formData, serviceStartDate: val })}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* Service Type Dropdown */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Service Type</Text>
        <TouchableOpacity
          className="border border-gray-300 rounded-xl px-4 py-3 bg-white flex-row items-center justify-between"
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text className={formData.serviceType ? 'text-gray-900' : 'text-gray-400'}>
            {formData.serviceType || 'Select service type'}
          </Text>
          <ChevronDown size={18} color="#9ca3af" />
        </TouchableOpacity>

        {showDropdown && (
          <View className="border border-gray-200 rounded-xl mt-1 bg-white shadow-sm overflow-hidden">
            {SERVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                className={`px-4 py-3 border-b border-gray-100 ${formData.serviceType === type ? 'bg-blue-50' : ''}`}
                onPress={() => {
                  setFormData({ ...formData, serviceType: type });
                  setShowDropdown(false);
                }}
              >
                <Text className={`text-sm ${formData.serviceType === type ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Info Note */}
      <View className="bg-blue-50 rounded-xl p-4 flex-row items-start mt-2 mb-6">
        <CheckCircle size={18} color="#2563eb" />
        <Text className="text-sm text-blue-700 ml-2 flex-1">
          All fields are required for a complete inspection record. Ensure accuracy before proceeding.
        </Text>
      </View>
    </ScrollView>
  );
}
