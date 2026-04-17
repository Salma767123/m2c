import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Upload, X, ChevronDown } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { FieldError, compactBorder } from '../FormFields';

interface PreparationProps {
  formData: {
    items: Array<{
      id: number;
      itemName: string;
      itemDescription: string;
      totalQuantity: number;
      inspectionQuantity: number;
      status: string;
    }>;
    warehousePhotoEvidences: any[];
  };
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
}

const STATUS_OPTIONS = ['Pending', 'Ready', 'In Progress', 'Completed'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return { bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'Ready': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
    case 'In Progress': return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'Completed': return { bg: 'bg-gray-100', text: 'text-gray-800' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};

export default function Preparation({ formData, setFormData, errors = {} }: PreparationProps) {
  const errorCount = Object.keys(errors).length;
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const updateItem = (id: number, field: string, value: any) => {
    const updated = formData.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setFormData({ ...formData, items: updated });
  };

  const handlePhotos = (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.data || img.uri,
    }));
    setFormData({
      ...formData,
      warehousePhotoEvidences: [...formData.warehousePhotoEvidences, ...newPhotos],
    });
  };

  const removePhoto = (index: number) => {
    const updated = formData.warehousePhotoEvidences.filter((_, i) => i !== index);
    setFormData({ ...formData, warehousePhotoEvidences: updated });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Preparation</Text>
        <Text className="text-sm text-gray-500">Review items and update quantities for inspection</Text>
      </View>

      

      {/* Items */}
      {formData.items.map((item, idx) => {
        const statusColor = getStatusColor(item.status);
        return (
          <View key={item.id} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
            <Text className="text-sm font-bold text-gray-900 mb-3">Item #{idx + 1}</Text>

            <View className="mb-2">
              <Text className="text-xs text-gray-500 font-semibold mb-1">Item Name</Text>
              <Text className="text-sm text-gray-800">{item.itemName}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 font-semibold mb-1">Description</Text>
              <Text className="text-sm text-gray-600">{item.itemDescription}</Text>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold mb-1">
                  Total Qty <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`${compactBorder(errors[`items.${idx}.totalQuantity`])} text-gray-900 text-sm`}
                  value={String(item.totalQuantity || '')}
                  onChangeText={(val) => updateItem(item.id, 'totalQuantity', Number(val) || 0)}
                  keyboardType="numeric"
                />
                <FieldError msg={errors[`items.${idx}.totalQuantity`]} />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold mb-1">
                  Inspection Qty <Text className="text-red-500">*</Text>
                </Text>
                <TextInput
                  className={`${compactBorder(errors[`items.${idx}.inspectionQuantity`])} text-gray-900 text-sm`}
                  value={String(item.inspectionQuantity || '')}
                  onChangeText={(val) => updateItem(item.id, 'inspectionQuantity', Number(val) || 0)}
                  keyboardType="numeric"
                />
                <FieldError msg={errors[`items.${idx}.inspectionQuantity`]} />
              </View>
            </View>

            {/* Status Dropdown */}
            <View>
              <Text className="text-xs text-gray-500 font-semibold mb-1">Status</Text>
              <TouchableOpacity
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white flex-row items-center justify-between"
                onPress={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
              >
                <View className={`px-2 py-0.5 rounded-full ${statusColor.bg}`}>
                  <Text className={`text-xs font-bold ${statusColor.text}`}>{item.status}</Text>
                </View>
                <ChevronDown size={16} color="#9ca3af" />
              </TouchableOpacity>

              {activeDropdown === item.id && (
                <View className="border border-gray-200 rounded-lg mt-1 bg-white overflow-hidden">
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      className="px-3 py-2 border-b border-gray-100"
                      onPress={() => {
                        updateItem(item.id, 'status', opt);
                        setActiveDropdown(null);
                      }}
                    >
                      <Text className="text-sm text-gray-700">{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Photo Evidence */}
      <View className="mt-4 mb-6">
        <Text className="text-sm font-bold text-gray-900 mb-3">
          Warehouse Photo Evidence <Text className="text-red-500">*</Text>
        </Text>

        <TouchableOpacity
          className={`border-2 border-dashed rounded-xl py-6 items-center justify-center ${
            errors.warehousePhotoEvidences
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 bg-gray-50'
          }`}
          onPress={() => showImagePickerOptions(handlePhotos)}
        >
          <Upload size={24} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-2">Tap to add photos</Text>
        </TouchableOpacity>
        <FieldError msg={errors.warehousePhotoEvidences} />

        {formData.warehousePhotoEvidences.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {formData.warehousePhotoEvidences.map((photo, idx) => (
              <View key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative">
                <Image source={{ uri: photo.uri || photo.data }} className="w-full h-full" />
                <TouchableOpacity
                  className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                  onPress={() => removePhoto(idx)}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
