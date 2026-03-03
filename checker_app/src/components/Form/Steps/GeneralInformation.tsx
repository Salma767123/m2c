import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { CheckCircle, ChevronDown } from 'lucide-react-native';

interface GeneralInformationProps {
  formData?: {
    client: string;
    vendor: string;
    factory: string;
    serviceLocation: string;
    serviceStartDate: string;
    serviceType: string;
  };
  setFormData?: (data: any) => void;
}

export function GeneralInformation({ formData, setFormData }: GeneralInformationProps) {
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
  
  const [localFormData, setLocalFormData] = useState({
    client: formData?.client || '',
    vendor: formData?.vendor || '',
    factory: formData?.factory || '',
    serviceLocation: formData?.serviceLocation || '',
    serviceStartDate: formData?.serviceStartDate || '',
    serviceType: formData?.serviceType || 'Pre-Shipment Inspection',
  });

  const serviceTypes = [
    "Pre-Shipment Inspection",
    "During Production Inspection",
    "Pre-Production Inspection",
    "Container Loading Supervision",
    "Factory Audit",
    "Product Testing"
  ];

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">General Information</Text>
        <Text className="text-sm text-slate-600">
          Basic information about the vendor, client, and service details
        </Text>
      </View>

      <View className="space-y-4">
        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Client:</Text>
          <TextInput
            value={localFormData.client}
            onChangeText={(text) => updateFormData({ client: text })}
            placeholder="Enter client name"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Vendor:</Text>
          <TextInput
            value={localFormData.vendor}
            onChangeText={(text) => updateFormData({ vendor: text })}
            placeholder="Enter vendor name"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Factory:</Text>
          <TextInput
            value={localFormData.factory}
            onChangeText={(text) => updateFormData({ factory: text })}
            placeholder="Enter factory name"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Service Location:</Text>
          <TextInput
            value={localFormData.serviceLocation}
            onChangeText={(text) => updateFormData({ serviceLocation: text })}
            placeholder="Enter service location"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Service Start Date:</Text>
          <TextInput
            value={localFormData.serviceStartDate}
            onChangeText={(text) => updateFormData({ serviceStartDate: text })}
            placeholder="YYYY-MM-DD"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Service Type:</Text>
          <TouchableOpacity
            onPress={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white flex-row items-center justify-between"
          >
            <Text className="text-slate-900">{localFormData.serviceType}</Text>
            <ChevronDown 
              size={16} 
              color="#475569" 
              style={{ transform: [{ rotate: showServiceTypeDropdown ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
          
          {showServiceTypeDropdown && (
            <View className="mt-2 bg-white border border-slate-300 rounded-xl">
              {serviceTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    updateFormData({ serviceType: type });
                    setShowServiceTypeDropdown(false);
                  }}
                  className={`px-4 py-3 ${
                    localFormData.serviceType === type
                      ? 'bg-blue-50 border-l-2 border-blue-600'
                      : 'bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      localFormData.serviceType === type
                        ? 'text-blue-600 font-medium'
                        : 'text-slate-700'
                    }`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <View className="flex-row items-start gap-3">
            <View className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle size={20} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-blue-900 mb-2">Information Note</Text>
              <Text className="text-blue-800 text-xs">
                Please ensure all general information is accurate as it will be included in the final inspection report. 
                This information helps identify the service scope and parties involved in the quality control process.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

