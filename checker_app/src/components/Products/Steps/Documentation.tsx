import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Upload, X } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';

interface DocumentationProps {
  formData: {
    inspectorSignature: string;
    documentationPhotos: any[];
    photocopyDocuments: any[];
    companyIdCards: any[];
  };
  setFormData: (data: any) => void;
}

export default function Documentation({ formData, setFormData }: DocumentationProps) {
  const makePhotoHandler = (field: string) => (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.uri,
      id: Date.now() + Math.random(),
    }));
    setFormData({ ...formData, [field]: [...(formData as any)[field], ...newPhotos] });
  };

  const makeRemoveHandler = (field: string) => (index: number) => {
    setFormData({ ...formData, [field]: (formData as any)[field].filter((_: any, i: number) => i !== index) });
  };

  const renderPhotoSection = (
    title: string,
    subtitle: string,
    field: string,
    borderColor: string,
    bgColor: string,
    iconColor: string,
    required: boolean
  ) => {
    const photos = (formData as any)[field] || [];
    return (
      <View className="mb-4">
        <View className="flex-row items-center mb-2">
          <Text className="text-sm font-bold text-gray-900">{title}</Text>
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </View>
        <Text className="text-xs text-gray-500 mb-2">{subtitle}</Text>

        <TouchableOpacity
          className={`border-2 border-dashed ${borderColor} rounded-xl py-5 items-center ${bgColor}`}
          onPress={() => showImagePickerOptions(makePhotoHandler(field))}
        >
          <Upload size={20} color={iconColor} />
          <Text className="text-xs text-gray-500 mt-1">Tap to add photos</Text>
        </TouchableOpacity>

        {photos.length > 0 && (
          <View className="flex-row flex-wrap mt-2 gap-2">
            {photos.map((photo: any, idx: number) => (
              <View key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative">
                <Image source={{ uri: photo.uri || photo.data }} className="w-full h-full" />
                <TouchableOpacity
                  className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                  onPress={() => makeRemoveHandler(field)(idx)}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Documentation</Text>
        <Text className="text-sm text-gray-500">Upload documents and provide inspector details</Text>
      </View>

      {/* Inspector Signature */}
      <View className="mb-5">
        <Text className="text-sm font-semibold text-gray-700 mb-1">Inspector Signature / Initials</Text>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-gray-900 bg-white"
          value={formData.inspectorSignature}
          onChangeText={(val) => setFormData({ ...formData, inspectorSignature: val })}
          placeholder="Enter your signature or initials"
        />
      </View>

      {renderPhotoSection(
        'General Documentation',
        'Signed draft report, packing list, etc.',
        'documentationPhotos',
        'border-gray-300',
        'bg-gray-50',
        '#9ca3af',
        false
      )}

      {renderPhotoSection(
        'Photocopy Documents',
        'Photocopy of relevant documents',
        'photocopyDocuments',
        'border-blue-300',
        'bg-blue-50',
        '#3b82f6',
        true
      )}

      {renderPhotoSection(
        'Company ID Card',
        'ID identification card',
        'companyIdCards',
        'border-green-300',
        'bg-green-50',
        '#22c55e',
        true
      )}

      <View className="mb-6" />
    </ScrollView>
  );
}
