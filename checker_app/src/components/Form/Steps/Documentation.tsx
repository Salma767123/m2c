import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface DocumentationProps {
  formData?: {
    inspectorSignature: string;
    documentationPhotos: string[];
    photocopyDocuments: string[];
    companyIdCards: string[];
  };
  setFormData?: (data: any) => void;
}

export function Documentation({ formData, setFormData }: DocumentationProps) {
  const [localFormData, setLocalFormData] = useState({
    inspectorSignature: formData?.inspectorSignature || '',
    documentationPhotos: formData?.documentationPhotos || [],
    photocopyDocuments: formData?.photocopyDocuments || [],
    companyIdCards: formData?.companyIdCards || [],
  });

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const handleDocumentationPhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        documentationPhotos: [...localFormData.documentationPhotos, ...photoNames] 
      });
    }, true);
  };

  const handlePhotocopyUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        photocopyDocuments: [...localFormData.photocopyDocuments, ...photoNames] 
      });
    }, true);
  };

  const handleCompanyIdUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        companyIdCards: [...localFormData.companyIdCards, ...photoNames] 
      });
    }, true);
  };

  const removeDocumentationPhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.documentationPhotos.filter((_, i) => i !== photoIndex);
    updateFormData({ documentationPhotos: updatedPhotos });
  };

  const removePhotocopyDocument = (photoIndex: number) => {
    const updatedPhotos = localFormData.photocopyDocuments.filter((_, i) => i !== photoIndex);
    updateFormData({ photocopyDocuments: updatedPhotos });
  };

  const removeCompanyIdCard = (photoIndex: number) => {
    const updatedPhotos = localFormData.companyIdCards.filter((_, i) => i !== photoIndex);
    updateFormData({ companyIdCards: updatedPhotos });
  };

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">Final Documentation</Text>
        <Text className="text-sm text-slate-600">
          Finalize inspection with signature and packing list
        </Text>
      </View>

      {/* Inspector Signature */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">Inspector Signature/Initials:</Text>
        <TextInput
          value={localFormData.inspectorSignature}
          onChangeText={(text) => updateFormData({ inspectorSignature: text })}
          placeholder="Enter signature or initials"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* General Documentation Photos */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">General Documentation:</Text>
        <Text className="text-slate-600 text-sm mb-4">
          Signed draft report, packing list, signed declaration
        </Text>
        
        <TouchableOpacity
          onPress={handleDocumentationPhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={40} color="#94a3b8" />
            <Text className="text-slate-700 font-medium text-sm mt-2">Upload documentation</Text>
            <Text className="text-slate-500 text-xs mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* General Documentation Photos List */}
        {localFormData.documentationPhotos && localFormData.documentationPhotos.length > 0 && (
          <View className="mt-4">
            <Text className="font-medium text-gray-900 mb-2">
              Uploaded Images ({localFormData.documentationPhotos.length}):
            </Text>
            {localFormData.documentationPhotos.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDocumentationPhoto(index)}
                  className="p-1"
                >
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Photocopy Documents */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">
          Photocopy Documents: <Text className="text-red-500">*</Text>
        </Text>
        <Text className="text-slate-600 text-sm mb-4">
          Required: Upload photocopy of relevant documents
        </Text>
        
        <TouchableOpacity
          onPress={handlePhotocopyUpload}
          className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50"
        >
          <View className="items-center">
            <Upload size={40} color="#60a5fa" />
            <Text className="text-slate-700 font-medium text-sm mt-2">Upload photocopy</Text>
            <Text className="text-slate-500 text-xs mt-1">Required documents</Text>
          </View>
        </TouchableOpacity>

        {/* Photocopy Documents List */}
        {localFormData.photocopyDocuments && localFormData.photocopyDocuments.length > 0 && (
          <View className="mt-4">
            <Text className="font-medium text-gray-900 mb-2">
              Uploaded Images ({localFormData.photocopyDocuments.length}):
            </Text>
            {localFormData.photocopyDocuments.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-blue-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#60a5fa" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removePhotocopyDocument(index)}
                  className="p-1"
                >
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Company ID Card */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">
          Company ID Card: <Text className="text-red-500">*</Text>
        </Text>
        <Text className="text-slate-600 text-sm mb-4">
          Required: Upload company identification card
        </Text>
        
        <TouchableOpacity
          onPress={handleCompanyIdUpload}
          className="border-2 border-dashed border-green-300 rounded-xl p-6 bg-green-50"
        >
          <View className="items-center">
            <Upload size={40} color="#4ade80" />
            <Text className="text-slate-700 font-medium text-sm mt-2">Upload ID card</Text>
            <Text className="text-slate-500 text-xs mt-1">Company identification</Text>
          </View>
        </TouchableOpacity>

        {/* Company ID Cards List */}
        {localFormData.companyIdCards && localFormData.companyIdCards.length > 0 && (
          <View className="mt-4">
            <Text className="font-medium text-gray-900 mb-2">
              Uploaded Images ({localFormData.companyIdCards.length}):
            </Text>
            {localFormData.companyIdCards.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-green-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#4ade80" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeCompanyIdCard(index)}
                  className="p-1"
                >
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
