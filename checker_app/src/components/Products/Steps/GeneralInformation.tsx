import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, CheckCircle } from 'lucide-react-native';
import { Label, FieldError, fieldBorder } from '../FormFields';

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
  errors?: Record<string, string>;
}

const SERVICE_TYPES = [
  'Pre-Shipment Inspection',
  'During Production Inspection',
  'Pre-Production Inspection',
  'Container Loading Supervision',
  'Factory Audit',
  'Product Testing',
];

export default function GeneralInformation({ formData, setFormData, errors = {} }: GeneralInformationProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const errorCount = Object.keys(errors).length;

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">General Information</Text>
        <Text className="text-sm text-gray-500">Provide basic details about the inspection service</Text>
      </View>

      

      <View className="mb-4">
        <Label required>Client</Label>
        <TextInput
          className={`${fieldBorder(errors.client)} text-gray-900`}
          value={formData.client}
          onChangeText={(val) => setFormData({ ...formData, client: val })}
          placeholder="Client name"
        />
        <FieldError msg={errors.client} />
      </View>

      <View className="mb-4">
        <Label required>Vendor</Label>
        <TextInput
          className={`${fieldBorder(errors.vendor)} text-gray-900`}
          value={formData.vendor}
          onChangeText={(val) => setFormData({ ...formData, vendor: val })}
          placeholder="Vendor name"
        />
        <FieldError msg={errors.vendor} />
      </View>

      <View className="mb-4">
        <Label required>Factory</Label>
        <TextInput
          className={`${fieldBorder(errors.factory)} text-gray-900`}
          value={formData.factory}
          onChangeText={(val) => setFormData({ ...formData, factory: val })}
          placeholder="Factory name"
        />
        <FieldError msg={errors.factory} />
      </View>

      <View className="mb-4">
        <Label required>Service Location</Label>
        <TextInput
          className={`${fieldBorder(errors.serviceLocation)} text-gray-900`}
          value={formData.serviceLocation}
          onChangeText={(val) => setFormData({ ...formData, serviceLocation: val })}
          placeholder="Service location"
        />
        <FieldError msg={errors.serviceLocation} />
      </View>

      <View className="mb-4">
        <Label required>Service Start Date</Label>
        <TextInput
          className={`${fieldBorder(errors.serviceStartDate)} text-gray-900`}
          value={formData.serviceStartDate}
          onChangeText={(val) => setFormData({ ...formData, serviceStartDate: val })}
          placeholder="YYYY-MM-DD"
        />
        <FieldError msg={errors.serviceStartDate} />
      </View>

      <View className="mb-4">
        <Label required>Service Type</Label>
        <TouchableOpacity
          className={`${fieldBorder(errors.serviceType)} flex-row items-center justify-between`}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text className={formData.serviceType ? 'text-gray-900' : 'text-gray-400'}>
            {formData.serviceType || 'Select service type'}
          </Text>
          <ChevronDown size={18} color="#9ca3af" />
        </TouchableOpacity>
        <FieldError msg={errors.serviceType} />

        {showDropdown && (
          <View className="border border-gray-200 rounded-xl mt-1 bg-white overflow-hidden">
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

      <View className="bg-blue-50 rounded-xl p-4 flex-row items-start mt-2 mb-6">
        <CheckCircle size={18} color="#2563eb" />
        <Text className="text-sm text-blue-700 ml-2 flex-1">
          All fields are required for a complete inspection record.
        </Text>
      </View>
    </ScrollView>
  );
}
