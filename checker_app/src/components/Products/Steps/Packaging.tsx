import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Upload, X } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';

interface PackagingProps {
  formData: {
    shipperCartonRemark: string;
    innerCartonRemark: string;
    retailPackagingRemark: string;
    productTypeRemark: string;
    aqlWorkmanshipRemark: string;
    onSiteTestsRemark: string;
    packagingPhotos: any[];
  };
  setFormData: (data: any) => void;
}

const REMARK_SECTIONS = [
  { key: 'shipperCartonRemark', label: 'Shipper Carton Packaging', detail: 'Front, side, top views' },
  { key: 'innerCartonRemark', label: 'Inner Carton Packaging', detail: 'Inner packaging condition' },
  { key: 'retailPackagingRemark', label: 'Retail Packaging', detail: 'Brand sticker, warning labels' },
  { key: 'productTypeRemark', label: 'Product Type Conformity', detail: 'Matches approved specs' },
  { key: 'aqlWorkmanshipRemark', label: 'AQL (Workmanship/Appearance)', detail: 'Visual and functional checks' },
  { key: 'onSiteTestsRemark', label: 'On-site Tests', detail: 'Drop test, color fastness, seam strength' },
];

const REMARK_CODES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function Packaging({ formData, setFormData }: PackagingProps) {
  const handleRemarkSelect = (key: string, value: string) => {
    const current = (formData as any)[key];
    setFormData({ ...formData, [key]: current === value ? '' : value });
  };

  const handlePhotos = (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.uri,
    }));
    setFormData({ ...formData, packagingPhotos: [...formData.packagingPhotos, ...newPhotos] });
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, packagingPhotos: formData.packagingPhotos.filter((_, i) => i !== index) });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Packaging</Text>
        <Text className="text-sm text-gray-500">Rate each packaging aspect using codes 1-10</Text>
      </View>

      {REMARK_SECTIONS.map((section) => {
        const currentValue = (formData as any)[section.key];
        return (
          <View key={section.key} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
            <Text className="text-sm font-bold text-gray-900 mb-1">{section.label}</Text>
            <Text className="text-xs text-gray-500 mb-3">{section.detail}</Text>

            <View className="flex-row flex-wrap gap-2">
              {REMARK_CODES.map((code) => {
                const isSelected = currentValue === code;
                return (
                  <TouchableOpacity
                    key={code}
                    className={`w-9 h-9 rounded-full items-center justify-center border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300'
                    }`}
                    onPress={() => handleRemarkSelect(section.key, code)}
                  >
                    <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {currentValue && (
              <View className="flex-row items-center mt-2">
                <Text className="text-xs text-blue-600 font-medium">Selected: {currentValue}</Text>
                <TouchableOpacity className="ml-2" onPress={() => setFormData({ ...formData, [section.key]: '' })}>
                  <Text className="text-xs text-red-500 font-medium">Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Photos */}
      <View className="mt-2 mb-6">
        <Text className="text-sm font-bold text-gray-900 mb-3">Packaging Photos</Text>
        <TouchableOpacity
          className="border-2 border-dashed border-gray-300 rounded-xl py-6 items-center bg-gray-50"
          onPress={() => showImagePickerOptions(handlePhotos)}
        >
          <Upload size={24} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-2">Tap to add photos</Text>
        </TouchableOpacity>

        {formData.packagingPhotos.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {formData.packagingPhotos.map((photo, idx) => (
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
